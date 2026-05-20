import { Router } from 'express';
import { db } from '../db';
import { districts, regions } from '../db/schema';
import { eq, ilike, count, asc, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

// GET /api/districts — paginated with region name
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;

    let baseQuery = db.select({
      id: districts.id,
      districtName: districts.districtName,
      districtCode: districts.districtCode,
      regionId: districts.regionId,
      regionName: regions.regionName,
    }).from(districts).leftJoin(regions, eq(districts.regionId, regions.id));

    const conditions: any[] = [];
    if (search) conditions.push(ilike(districts.districtName, `%${search}%`));
    if (regionId) conditions.push(eq(districts.regionId, regionId));

    if (conditions.length) {
      baseQuery = baseQuery.where(sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}`) as typeof baseQuery;
    }

    const totalResult = await db.select({ count: count() }).from(districts);
    const total = totalResult[0]?.count ?? 0;

    const data = await baseQuery.orderBy(asc(districts.districtName)).limit(limit).offset(offset);
    res.json({ data, page, limit, total, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

// GET /api/districts/all — unpaginated for selects, optionally filter by region
router.get('/all', async (req, res) => {
  const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;
  let query = db.select({ id: districts.id, districtName: districts.districtName, regionId: districts.regionId }).from(districts);
  if (regionId) query = query.where(eq(districts.regionId, regionId)) as typeof query;
  const data = await query.orderBy(asc(districts.districtName));
  res.json({ data });
});

// POST /api/districts
router.post('/', requirePermission('users:write'), async (req, res) => {
  try {
    const { districtName, regionId, districtCode } = req.body;
    const [created] = await db.insert(districts).values({ districtName, regionId, districtCode }).returning();
    await auditLog({ tableName: 'districts', recordId: created.id, actionType: 'INSERT', newData: created, changedBy: req.user?.id });
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create district' });
  }
});

// PUT /api/districts/:id
router.put('/:id', requirePermission('users:write'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { districtName, regionId, districtCode } = req.body;
    const old = await db.select().from(districts).where(eq(districts.id, id)).limit(1);
    const [updated] = await db.update(districts).set({ districtName, regionId, districtCode }).where(eq(districts.id, id)).returning();
    await auditLog({ tableName: 'districts', recordId: id, actionType: 'UPDATE', oldData: old[0], newData: updated, changedBy: req.user?.id });
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update district' });
  }
});

// DELETE /api/districts/:id
router.delete('/:id', requirePermission('users:delete'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(districts).where(eq(districts.id, id));
    await auditLog({ tableName: 'districts', recordId: id, actionType: 'DELETE', changedBy: req.user?.id });
    res.json({ message: 'District deleted' });
  } catch (err: any) {
    if (err.code === '23503') return res.status(409).json({ error: 'Cannot delete — district has linked records' });
    res.status(500).json({ error: 'Failed to delete district' });
  }
});

export default router;
