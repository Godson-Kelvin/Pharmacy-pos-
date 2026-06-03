import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { generateToken } from '../lib/auth.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', authenticate, (_req, res) => {
  res.clearCookie('token', { path: '/', sameSite: 'lax' });
  res.json({ success: true });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  res.json(user);
});

router.get('/users', authenticate, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

router.post('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role: role || 'CASHIER' },
      select: { id: true, email: true, name: true, role: true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const data = {};

    if (email) data.email = email;
    if (name) data.name = name;
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, role: true },
    });

    res.json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
