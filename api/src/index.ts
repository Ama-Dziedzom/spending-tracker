import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { parseSmsRouter } from './routes/parse-sms.js';
import { processSmsRouter } from './routes/process-sms.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({
  origin: '*',
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
}));
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', parseSmsRouter);
app.use('/api', processSmsRouter);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Spending Tracker API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});

export default app;
