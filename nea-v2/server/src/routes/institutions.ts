import { Router } from 'express';
import { db } from '../db';
import { institutions, regions, districts } from '../db/schema';
import { eq, ilike, count, asc, sql, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

// GET /api/institutions — paginated list
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const type = req.query.type as string | undefined;
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;
    const districtId = req.query.districtId ? Number(req.query.districtId) : undefined;

    let baseQuery = db.select({
      id: institutions.id,
      centerNumber: institutions.centerNumber,
      name: institutions.name,
      type: institutions.type,
      category: institutions.category,
      regionId: institutions.regionId,
      regionName: regions.regionName,
      districtId: institutions.districtId,
      districtName: districts.districtName,
      postalAddress: institutions.postalAddress,
      email: institutions.email,
      phone: institutions.phone,
    }).from(institutions)
      .leftJoin(regions, eq(institutions.regionId, regions.id))
      .leftJoin(districts, eq(institutions.districtId, districts.id));

    const conditions: any[] = [];
    if (search) conditions.push(ilike(institutions.name, `%${search}%`));
    if (type) conditions.push(eq(institutions.type, type));
    if (regionId) conditions.push(eq(institutions.regionId, regionId));
    if (districtId) conditions.push(eq(institutions.districtId, districtId));

    if (conditions.length) {
      baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;
    }

    // Count total with conditions
    let countQuery = db.select({ count: count() }).from(institutions);
    if (conditions.length) {
      countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
    }
    const totalResult = await countQuery;
    const total = totalResult[0]?.count ?? 0;

    const data = await baseQuery.orderBy(asc(institutions.centerNumber)).limit(limit).offset(offset);
    res.json({ data, page, limit, total, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch institutions' });
  }
});

// POST /api/institutions
router.post('/', requirePermission('master_summaries:write'), async (req, res) => {
  try {
    const data = req.body;
    const [created] = await db.insert(institutions).values(data).returning();
    await auditLog({ tableName: 'institutions', recordId: created.id, actionType: 'INSERT', newData: created, changedBy: req.user?.id });
    res.status(201).json({ data: created });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Center number already exists' });
    res.status(500).json({ error: 'Failed to create institution' });
  }
});

// PUT /api/institutions/:id
router.put('/:id', requirePermission('master_summaries:write'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    const old = await db.select().from(institutions).where(eq(institutions.id, id)).limit(1);
    const [updated] = await db.update(institutions).set(data).where(eq(institutions.id, id)).returning();
    await auditLog({ tableName: 'institutions', recordId: id, actionType: 'UPDATE', oldData: old[0], newData: updated, changedBy: req.user?.id });
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update institution' });
  }
});

// DELETE /api/institutions/:id
router.delete('/:id', requirePermission('master_summaries:write'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(institutions).where(eq(institutions.id, id));
    await auditLog({ tableName: 'institutions', recordId: id, actionType: 'DELETE', changedBy: req.user?.id });
    res.json({ message: 'Institution deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete institution' });
  }
});

export default router;
