import { Router } from 'express';
import { db } from '../db';
import { regions, districts } from '../db/schema';
import { eq, ilike, count, asc, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

// GET /api/regions — paginated list with district count
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    let query = db.select({
      id: regions.id,
      regionCode: regions.regionCode,
      regionName: regions.regionName,
      town: regions.town,
      reo: regions.reo,
      reoEmail: regions.reoEmail,
      reoPhone: regions.reoPhone,
      postalAddress: regions.postalAddress,
      districtCount: sql<number>`(select count(*) from districts where districts.region_id = regions.id)`,
    }).from(regions);

    if (search) {
      query = query.where(ilike(regions.regionName, `%${search}%`)) as typeof query;
    }

    const totalResult = await db.select({ count: count() }).from(regions);
    const total = totalResult[0]?.count ?? 0;

    const data = await query.orderBy(asc(regions.regionCode)).limit(limit).offset(offset);

    res.json({ data, page, limit, total, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// GET /api/regions/all — unpaginated for selects
router.get('/all', async (req, res) => {
  const data = await db.select().from(regions).orderBy(asc(regions.regionCode));
  res.json({ data });
});

// POST /api/regions
router.post('/', requirePermission('users:write'), async (req, res) => {
  try {
    const { regionCode, regionName, town, reo, reoEmail, reoPhone, postalAddress } = req.body;
    const [created] = await db.insert(regions).values({ 
      regionCode, 
      regionName, 
      town,
      reo,
      reoEmail,
      reoPhone,
      postalAddress
    }).returning();
    await auditLog({ tableName: 'regions', recordId: created.id, actionType: 'INSERT', newData: created, changedBy: req.user?.id });
    res.status(201).json({ data: created });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Region code already exists' });
    res.status(500).json({ error: 'Failed to create region' });
  }
});

// PUT /api/regions/:id
router.put('/:id', requirePermission('users:write'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { regionCode, regionName, town, reo, reoEmail, reoPhone, postalAddress } = req.body;
    const old = await db.select().from(regions).where(eq(regions.id, id)).limit(1);
    const [updated] = await db.update(regions).set({ 
      regionCode, 
      regionName, 
      town,
      reo,
      reoEmail,
      reoPhone,
      postalAddress
    }).where(eq(regions.id, id)).returning();
    await auditLog({ tableName: 'regions', recordId: id, actionType: 'UPDATE', oldData: old[0], newData: updated, changedBy: req.user?.id });
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update region' });
  }
});

// DELETE /api/regions/:id
router.delete('/:id', requirePermission('users:delete'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const old = await db.select().from(regions).where(eq(regions.id, id)).limit(1);
    await db.delete(regions).where(eq(regions.id, id));
    await auditLog({ tableName: 'regions', recordId: id, actionType: 'DELETE', oldData: old[0], changedBy: req.user?.id });
    res.json({ message: 'Region deleted' });
  } catch (err: any) {
    if (err.code === '23503') return res.status(409).json({ error: 'Cannot delete — region has linked districts' });
    res.status(500).json({ error: 'Failed to delete region' });
  }
});

export default router;
