import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { parseSmsRouter } from './routes/parse-sms.js';
import { processSmsRouter } from './routes/process-sms.js';
import { authSmsRouter } from './routes/auth-sms.js';
import { deleteAccountRouter } from './routes/delete-account.js';
import { appConfigRouter } from './routes/app-config.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({
  origin: '*',
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
}));
// Supabase auth hook needs the raw body to check its signature
app.use('/api', authSmsRouter);
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', parseSmsRouter);
app.use('/api', processSmsRouter);
app.use('/', parseSmsRouter);
app.use('/', processSmsRouter);
app.use('/api', deleteAccountRouter);
app.use('/', deleteAccountRouter);
app.use('/api', appConfigRouter);
app.use('/', appConfigRouter);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const HOST = '0.0.0.0';
app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Spending Tracker API running on http://${HOST}:${PORT}`);
  console.log(`   Health check: http://${HOST}:${PORT}/api/health`);
});

export default app;
