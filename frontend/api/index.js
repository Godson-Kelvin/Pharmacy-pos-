// Vercel serverless entry point.
//
// Self-contained Express app. Vercel exposes this file at /api/*, so the
// full request URL (e.g. /api/auth/login) is what Express sees. We mount
// every route under the /api prefix to match.
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('CORS: origin not allowed'))),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const cookies = (req.headers.cookie || '').split(';').reduce((acc, s) => {
    const [k, v] = s.split('=').map((p) => p && p.trim());
    if (k && v) acc[k] = decodeURIComponent(v);
    return acc;
  }, {});
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : cookies.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  next();
}

async function getNextReceiptNo() {
  const count = await prisma.sale.count();
  return `RCT-${String(count + 1).padStart(6, '0')}`;
}

// --- Health / readiness (mounted at /api) ---
app.get('/api/health', async (_req, res) => {
  if (!process.env.DATABASE_URL) return res.status(503).json({ status: 'degraded', db: 'not_configured', dbError: 'DATABASE_URL env var is missing' });
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', message: 'Pharmacy POS API is running', db: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'error', dbError: err.message });
  }
});

// --- Auth (mounted at /api) ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('[/api/auth/login]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', authenticate, (_req, res) => {
  res.clearCookie('token', { path: '/', sameSite: 'lax' });
  res.json({ success: true });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  res.json(user);
});

// --- Products ---
app.get('/api/products', authenticate, async (req, res) => {
  try {
    const { search, category } = req.query;
    const where = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }];
    if (category) where.category = category;
    const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/categories', authenticate, async (_req, res) => {
  try {
    const rows = await prisma.product.findMany({ select: { category: true }, distinct: ['category'] });
    res.json(rows.map((r) => r.category).sort());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, sku, category, price, quantity, supplier, description, expiryDate } = req.body;
    const product = await prisma.product.create({
      data: {
        name, sku, category, price: Number(price), quantity: Number(quantity) || 0,
        supplier: supplier || null, description: description || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, sku, category, price, quantity, supplier, description, expiryDate } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (sku !== undefined) data.sku = sku;
    if (category !== undefined) data.category = category;
    if (price !== undefined) data.price = Number(price);
    if (quantity !== undefined) data.quantity = Number(quantity);
    if (supplier !== undefined) data.supplier = supplier;
    if (description !== undefined) data.description = description;
    if (expiryDate !== undefined) data.expiryDate = expiryDate ? new Date(expiryDate) : null;
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticate, requireAdmin, async (req, res) => {
  try { await prisma.product.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Sales ---
app.get('/api/sales', authenticate, async (req, res) => {
  try {
    const { from, to, userId } = req.query;
    const where = {};
    if (from || to) where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
    if (userId) where.userId = userId;
    const sales = await prisma.sale.findMany({
      where, include: { items: { include: { product: true } }, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }, take: 500,
    });
    res.json(sales);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sales/stats', authenticate, async (req, res) => {
  try {
    const period = Number(req.query.period) || 7;
    const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
    const sales = await prisma.sale.findMany({ where: { createdAt: { gte: since } }, include: { items: true } });
    const total = sales.reduce((s, x) => s + x.total, 0);
    const count = sales.length;
    const byDay = {};
    for (const s of sales) {
      const d = s.createdAt.toISOString().slice(0, 10);
      byDay[d] = (byDay[d] || 0) + s.total;
    }
    const byPayment = {};
    for (const s of sales) byPayment[s.paymentMethod] = (byPayment[s.paymentMethod] || 0) + s.total;
    res.json({ total, count, average: count ? total / count : 0, byDay, byPayment, period });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sales', authenticate, async (req, res) => {
  try {
    const { items, paymentMethod } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items required' });
    const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
    const map = new Map(products.map((p) => [p.id, p]));
    let total = 0;
    const lineItems = items.map((i) => {
      const p = map.get(i.productId);
      if (!p) throw new Error(`Product ${i.productId} not found`);
      if (p.quantity < i.quantity) throw new Error(`Insufficient stock for ${p.name}`);
      const unitPrice = p.price;
      const subtotal = unitPrice * i.quantity;
      total += subtotal;
      return { productId: p.id, quantity: i.quantity, unitPrice, subtotal };
    });
    const receiptNo = await getNextReceiptNo();
    const sale = await prisma.sale.create({
      data: {
        receiptNo, userId: req.user.id, total, paymentMethod: paymentMethod || 'CASH',
        items: { create: lineItems },
      },
      include: { items: { include: { product: true } } },
    });
    await Promise.all(items.map((i) =>
      prisma.product.update({ where: { id: i.productId }, data: { quantity: { decrement: i.quantity } } })
    ));
    res.status(201).json(sale);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/sales/export', authenticate, async (_req, res) => {
  try {
    const sales = await prisma.sale.findMany({ include: { items: { include: { product: true } }, user: true }, orderBy: { createdAt: 'desc' } });
    const rows = [['ReceiptNo','Date','Cashier','PaymentMethod','Total','Items']];
    for (const s of sales) {
      const items = s.items.map((i) => `${i.product.name} x${i.quantity}`).join('; ');
      rows.push([s.receiptNo, s.createdAt.toISOString(), s.user.name, s.paymentMethod, s.total, items]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sales-export.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Users (admin only) ---
app.get('/api/auth/users', authenticate, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  res.json(users);
});

app.post('/api/auth/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed, name, role: role || 'CASHIER' }, select: { id: true, email: true, name: true, role: true } });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/auth/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const data = {};
    if (email) data.email = email;
    if (name) data.name = name;
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No update fields provided' });
    const user = await prisma.user.update({ where: { id: req.params.id }, data, select: { id: true, email: true, name: true, role: true } });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
