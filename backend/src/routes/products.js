import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import prisma from '../lib/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticate, async (req, res) => {
  const { search, category } = req.query;
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
  });
  res.json(products);
});

router.get('/categories', authenticate, async (_req, res) => {
  const categories = await prisma.product.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  res.json(categories.map((c) => c.category));
});

router.get('/:id', authenticate, async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, sku, category, price, quantity, expiryDate, supplier, description } = req.body;
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        category,
        price: parseFloat(price),
        quantity: parseInt(quantity) || 0,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        supplier,
        description,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, sku, category, price, quantity, expiryDate, supplier, description } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        sku,
        category,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        supplier,
        description,
      },
    });
    res.json(product);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

    const content = req.file.buffer.toString('utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

    const results = { created: 0, updated: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        const data = {
          name: row.name || row.Name,
          sku: row.sku || row.SKU,
          category: row.category || row.Category || 'General',
          price: parseFloat(row.price || row.Price || 0),
          quantity: parseInt(row.quantity || row.Quantity || 0),
          supplier: row.supplier || row.Supplier || null,
          description: row.description || row.Description || null,
          expiryDate: row.expiryDate || row['Expiry Date']
            ? new Date(row.expiryDate || row['Expiry Date'])
            : null,
        };

        if (!data.name || !data.sku) {
          results.errors.push({ row: i + 2, error: 'Name and SKU are required' });
          continue;
        }

        const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
        if (existing) {
          await prisma.product.update({ where: { sku: data.sku }, data });
          results.updated++;
        } else {
          await prisma.product.create({ data });
          results.created++;
        }
      } catch (err) {
        results.errors.push({ row: i + 2, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
