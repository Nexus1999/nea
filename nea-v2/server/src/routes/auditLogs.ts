import { Router } from 'express';
import { db } from '../db';
import { auditLogs, profiles } from '../db/schema';
import { eq, desc, ilike, and, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('users:view'));

// GET /api/audit-logs — paginated with search
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 500;
    const offset = (page - 1) * limit;

    const data = await db.select({
      id: auditLogs.id,
      tableName: auditLogs.tableName,
      recordId: auditLogs.recordId,
      actionType: auditLogs.actionType,
      oldData: auditLogs.oldData,
      newData: auditLogs.newData,
      changedAt: auditLogs.changedAt,
      username: profiles.username
    })
    .from(auditLogs)
    .leftJoin(profiles, eq(auditLogs.changedBy, profiles.id))
    .orderBy(desc(auditLogs.changedAt))
    .limit(limit)
    .offset(offset);

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
