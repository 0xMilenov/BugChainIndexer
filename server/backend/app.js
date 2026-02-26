const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { pool } = require('./services/db');

const app = express();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

// basic middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// health check
app.get('/health', async (req, res) => {
  const payload = { ok: true };
  try {
    const r = await pool.query('SELECT COUNT(*)::int AS n FROM contract_token_balances');
    payload.erc20_balances_count = r.rows[0]?.n ?? 0;
  } catch (e) {
    payload.erc20_balances_count = null;
  }
  res.json(payload);
});

// routes
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
app.use('/auth', authRoutes);
app.use('/', publicRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not Found' });
});

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Internal Server Error' });
});

module.exports = app;

