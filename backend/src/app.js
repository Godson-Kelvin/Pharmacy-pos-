import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import salesRoutes from './routes/sales.js';
import prisma from './lib/prisma.js';

dotenv.config();

const app = express();

// CORS: when deployed on Vercel the frontend and backend are on the same
// origin, so CORS doesn't apply. In dev / split deployments, allow the
// origins listed in CLIENT_ORIGIN (comma-separated) plus localhost defaults.
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin / curl / server-to-server (no Origin header).
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', async (_req, res) => {
  // Liveness: the function is up and responding.
  // Readiness: try a cheap DB round-trip so misconfiguration is visible.
  const result = { status: 'ok', message: 'Pharmacy POS API is running', db: 'unknown' };
  try {
    if (!process.env.DATABASE_URL) {
      result.db = 'not_configured';
      result.dbError = 'DATABASE_URL env var is missing';
      return res.status(503).json(result);
    }
    await prisma.$queryRaw`SELECT 1`;
    result.db = 'ok';
    res.json(result);
  } catch (err) {
    result.status = 'degraded';
    result.db = 'error';
    // Surface the real Prisma/connection error so it shows up in Vercel logs.
    result.dbError = err.message;
    console.error('[health] DB check failed:', err);
    res.status(503).json(result);
  }
});

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/sales', salesRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
