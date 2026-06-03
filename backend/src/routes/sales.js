import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

function generateReceiptNo() {
  const date = new Date();
  const prefix = `RCP-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

router.get('/', authenticate, async (req, res) => {
  const { startDate, endDate, limit = '50' } = req.query;
  const where = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      user: { select: { name: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
  });
  res.json(sales);
});

router.get('/stats', authenticate, async (req, res) => {
  const { period = '7' } = req.query;
  const days = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: startDate } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const dailyMap = {};
  const categoryMap = {};
  const paymentMap = {};
  let totalRevenue = 0;
  let totalTransactions = sales.length;

  for (const sale of sales) {
    const day = sale.createdAt.toISOString().split('T')[0];
    dailyMap[day] = (dailyMap[day] || 0) + sale.total;
    totalRevenue += sale.total;
    paymentMap[sale.paymentMethod] = (paymentMap[sale.paymentMethod] || 0) + sale.total;

    for (const item of sale.items) {
      const cat = item.product.category;
      categoryMap[cat] = (categoryMap[cat] || 0) + item.subtotal;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySales = sales.filter((s) => s.createdAt >= today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);

  const lowStock = await prisma.product.findMany({
    where: { quantity: { lte: 20 } },
    orderBy: { quantity: 'asc' },
    take: 10,
  });

  const totalProducts = await prisma.product.count();

  res.json({
    totalRevenue,
    totalTransactions,
    todayRevenue,
    todayTransactions: todaySales.length,
    averageSale: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
    dailySales: Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue })),
    categorySales: Object.entries(categoryMap).map(([category, revenue]) => ({ category, revenue })),
    paymentMethods: Object.entries(paymentMap).map(([method, revenue]) => ({ method, revenue })),
    lowStock,
    totalProducts,
  });
});

router.get('/export', authenticate, async (req, res) => {
  const { startDate, endDate } = req.query;
  const where = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      user: { select: { name: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = ['Receipt No', 'Date', 'Cashier', 'Product', 'SKU', 'Qty', 'Unit Price (GHS)', 'Subtotal (GHS)', 'Total (GHS)', 'Payment Method'];
  const rows = [headers.join(',')];

  for (const sale of sales) {
    for (const item of sale.items) {
      rows.push([
        sale.receiptNo,
        sale.createdAt.toISOString(),
        sale.user.name,
        `"${item.product.name}"`,
        item.product.sku,
        item.quantity,
        item.unitPrice.toFixed(2),
        item.subtotal.toFixed(2),
        sale.total.toFixed(2),
        sale.paymentMethod,
      ].join(','));
    }
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=sales-export-${Date.now()}.csv`);
  res.send(rows.join('\n'));
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { items, paymentMethod } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'Cart is empty' });

    const sale = await prisma.$transaction(async (tx) => {
      let total = 0;
      const saleItems = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
        }

        const subtotal = product.price * item.quantity;
        total += subtotal;
        saleItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal,
        });

        await tx.product.update({
          where: { id: product.id },
          data: { quantity: product.quantity - item.quantity },
        });
      }

      return tx.sale.create({
        data: {
          receiptNo: generateReceiptNo(),
          userId: req.user.id,
          total,
          paymentMethod: paymentMethod || 'CASH',
          items: { create: saleItems },
        },
        include: {
          user: { select: { name: true } },
          items: { include: { product: true } },
        },
      });
    });

    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { name: true } },
      items: { include: { product: true } },
    },
  });
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  res.json(sale);
});

export default router;
