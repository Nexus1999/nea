import { Router } from 'express';
import { db } from '../db';
import { stationeries, stationeryBoxLimits, stationeryReoDeoExtras, stationeryMultipliers, stationeryCenterMultipliers, masterSummaries, examinations } from '../db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

// GET /api/stationeries
router.get('/', requirePermission('stationeries:view'), async (req, res) => {
  try {
    const data = await db.select({
      id: stationeries.id,
      status: stationeries.status,
      createdAt: stationeries.createdAt,
      mid: stationeries.mid,
      examination: masterSummaries.examination,
      code: masterSummaries.code,
      year: masterSummaries.year,
    })
    .from(stationeries)
    .leftJoin(masterSummaries, eq(stationeries.mid, masterSummaries.id))
    .orderBy(desc(stationeries.createdAt));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stationeries' });
  }
});

// GET /api/stationeries/:id — full config
router.get('/:id', requirePermission('stationeries:view'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [stationery] = await db.select().from(stationeries).where(eq(stationeries.id, id));
    if (!stationery) return res.status(404).json({ error: 'Not found' });

    const boxLimit = await db.select().from(stationeryBoxLimits).where(eq(stationeryBoxLimits.stationeryId, id));
    const extras = await db.select().from(stationeryReoDeoExtras).where(eq(stationeryReoDeoExtras.stationeryId, id));
    const multipliers = await db.select().from(stationeryMultipliers).where(eq(stationeryMultipliers.stationeryId, id));
    const centerMultipliers = await db.select().from(stationeryCenterMultipliers).where(eq(stationeryCenterMultipliers.stationeryId, id));

    res.json({ stationery, boxLimit: boxLimit[0] || null, extras: extras[0] || null, multipliers, centerMultipliers: centerMultipliers[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stationery details' });
  }
});

// POST /api/stationeries
router.post('/', requirePermission('stationeries:write'), async (req, res) => {
  try {
    const { mid, status } = req.body;
    const [created] = await db.insert(stationeries).values({ mid, status }).returning();
    await auditLog({ tableName: 'stationeries', recordId: created.id, actionType: 'INSERT', newData: created, changedBy: req.user?.id });
    res.status(201).json({ data: created });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'A stationery record already exists for this master summary' });
    res.status(500).json({ error: 'Failed to create stationery' });
  }
});

// PUT /api/stationeries/:id/config — upsert all config sub-records
router.put('/:id/config', requirePermission('stationeries:write'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { boxLimit, extras, multipliers, centerMultipliers } = req.body;

    if (boxLimit !== undefined) {
      await db.delete(stationeryBoxLimits).where(eq(stationeryBoxLimits.stationeryId, id));
      if (boxLimit) await db.insert(stationeryBoxLimits).values({ stationeryId: id, maxPerBox: boxLimit.maxPerBox });
    }
    if (extras !== undefined) {
      await db.delete(stationeryReoDeoExtras).where(eq(stationeryReoDeoExtras.stationeryId, id));
      if (extras) await db.insert(stationeryReoDeoExtras).values({ stationeryId: id, reoExtras: extras.reoExtras, deoExtras: extras.deoExtras });
    }
    if (multipliers !== undefined) {
      await db.delete(stationeryMultipliers).where(eq(stationeryMultipliers.stationeryId, id));
      if (multipliers?.length) await db.insert(stationeryMultipliers).values(multipliers.map((m: any) => ({ stationeryId: id, subjectCode: m.subjectCode, multiplier: m.multiplier })));
    }
    if (centerMultipliers !== undefined) {
      await db.delete(stationeryCenterMultipliers).where(eq(stationeryCenterMultipliers.stationeryId, id));
      if (centerMultipliers) await db.insert(stationeryCenterMultipliers).values({ stationeryId: id, ...centerMultipliers });
    }

    res.json({ message: 'Stationery config updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update stationery config' });
  }
});

// PUT /api/stationeries/:id/status
router.put('/:id/status', requirePermission('stationeries:write'), async (req, res) => {
  try {
    const { status } = req.body;
    await db.update(stationeries).set({ status }).where(eq(stationeries.id, Number(req.params.id)));
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
