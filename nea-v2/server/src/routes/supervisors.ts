import { Router } from 'express';
import { db } from '../db';
import { supervisors, regions, districts } from '../db/schema';
import { eq, ilike, count, asc, or, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

// GET /api/supervisors — paginated with search
router.get('/', requirePermission('supervisors:view'), async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;

    let baseQuery = db.select({
      id: supervisors.id,
      supervisorName: supervisors.supervisorName,
      checkNumber: supervisors.checkNumber,
      subject: supervisors.subject,
      workstation: supervisors.workstation,
      phone: supervisors.phone,
      bankName: supervisors.bankName,
      accountNumber: supervisors.accountNumber,
      regionName: regions.regionName,
      districtName: districts.districtName,
    })
    .from(supervisors)
    .leftJoin(regions, eq(supervisors.regionId, regions.id))
    .leftJoin(districts, eq(supervisors.districtId, districts.id));

    const conditions: any[] = [];
    if (search) conditions.push(or(
      ilike(supervisors.supervisorName, `%${search}%`),
      ilike(supervisors.checkNumber, `%${search}%`),
    ));
    if (regionId) conditions.push(eq(supervisors.regionId, regionId));
    if (conditions.length) baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;

    const totalResult = await db.select({ count: count() }).from(supervisors);
    const total = totalResult[0]?.count ?? 0;

    const data = await baseQuery.orderBy(asc(supervisors.supervisorName)).limit(limit).offset(offset);
    res.json({ data, page, limit, total, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch supervisors' });
  }
});

// POST /api/supervisors
router.post('/', requirePermission('supervisors:write'), async (req, res) => {
  try {
    const payload = req.body;
    const [created] = await db.insert(supervisors).values(payload).returning();
    await auditLog({ tableName: 'supervisors', recordId: created.id, actionType: 'INSERT', newData: created, changedBy: req.user?.id });
    res.status(201).json({ data: created });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Check number already exists' });
    res.status(500).json({ error: 'Failed to create supervisor' });
  }
});

// POST /api/supervisors/bulk — CSV import
router.post('/bulk', requirePermission('supervisors:write'), async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows?.length) return res.status(400).json({ error: 'No rows provided' });
    const inserted = await db.insert(supervisors).values(rows).onConflictDoNothing().returning();
    await auditLog({ tableName: 'supervisors', recordId: 0, actionType: 'IMPORT', newData: { count: inserted.length }, changedBy: req.user?.id });
    res.status(201).json({ inserted: inserted.length, skipped: rows.length - inserted.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk import supervisors' });
  }
});

// PUT /api/supervisors/:id
router.put('/:id', requirePermission('supervisors:write'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const old = await db.select().from(supervisors).where(eq(supervisors.id, id)).limit(1);
    const [updated] = await db.update(supervisors).set(req.body).where(eq(supervisors.id, id)).returning();
    await auditLog({ tableName: 'supervisors', recordId: id, actionType: 'UPDATE', oldData: old[0], newData: updated, changedBy: req.user?.id });
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update supervisor' });
  }
});

// DELETE /api/supervisors/:id
router.delete('/:id', requirePermission('supervisors:delete'), async (req, res) => {
  try {
    await db.delete(supervisors).where(eq(supervisors.id, Number(req.params.id)));
    res.json({ message: 'Supervisor deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete supervisor' });
  }
});

export default router;
