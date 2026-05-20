import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { db } from './db';

import authRoutes from './routes/auth';
import regionsRoutes from './routes/regions';
import districtsRoutes from './routes/districts';
import examinationsRoutes from './routes/examinations';
import securityRoutes from './routes/security';
import masterSummariesRoutes from './routes/masterSummaries';
import supervisorsRoutes from './routes/supervisors';
import stationeriesRoutes from './routes/stationeries';
import teachersRoutes from './routes/teachers';
import budgetsRoutes from './routes/budgets';
import auditLogsRoutes from './routes/auditLogs';
import institutionsRoutes from './routes/institutions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(cookieParser());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/districts', districtsRoutes);
app.use('/api/examinations', examinationsRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/master-summaries', masterSummariesRoutes);
app.use('/api/supervisors', supervisorsRoutes);
app.use('/api/stationeries', stationeriesRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/institutions', institutionsRoutes);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await db.execute('SELECT 1' as any);
    res.json({ status: 'ok', timestamp: new Date(), db: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', timestamp: new Date(), db: 'disconnected' });
  }
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅  NEAS v2 API running on port ${PORT}`);
});
