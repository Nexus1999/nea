import { Router } from 'express';
import { db } from '../db';
import { masterSummaries, masterSummaryDetails, masterSummarySubjectCounts, examinations, regions, districts } from '../db/schema';
import { eq, desc, count, and, sql, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

// GET /api/master-summaries — paginated list
router.get('/', requirePermission('master_summaries:view'), async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const code = req.query.code as string | undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const conditions: any[] = [eq(masterSummaries.isLatest, true)];
    if (code) conditions.push(eq(masterSummaries.code, code));
    if (year) conditions.push(eq(masterSummaries.year, year));

    const totalResult = await db.select({ count: count() }).from(masterSummaries)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);
    const total = totalResult[0]?.count ?? 0;

    const data = await db.select({
      id: masterSummaries.id,
      examination: masterSummaries.examination,
      code: masterSummaries.code,
      year: masterSummaries.year,
      version: masterSummaries.version,
      isLatest: masterSummaries.isLatest,
      createdAt: masterSummaries.createdAt,
      centerCount: sql<number>`(select count(*) from master_summary_details where master_summary_details.mid = master_summaries.id and master_summary_details.is_latest = true)`,
      totalRegistered: sql<number>`(select coalesce(sum(registered), 0) from master_summary_details where master_summary_details.mid = master_summaries.id and master_summary_details.is_latest = true)`,
    })
    .from(masterSummaries)
    .where(conditions.length > 1 ? and(...conditions) : conditions[0])
    .orderBy(desc(masterSummaries.createdAt))
    .limit(limit).offset(offset);

    res.json({ data, page, limit, total, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch master summaries' });
  }
});

// GET /api/master-summaries/:id — single summary with center details
router.get('/:id', requirePermission('master_summaries:view'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const summary = await db.select().from(masterSummaries).where(eq(masterSummaries.id, id)).limit(1);
    if (!summary.length) return res.status(404).json({ error: 'Master summary not found' });

    const totalResult = await db.select({ count: count() }).from(masterSummaryDetails)
      .where(and(eq(masterSummaryDetails.mid, id), eq(masterSummaryDetails.isLatest, true)));
    const total = totalResult[0]?.count ?? 0;

    const details = await db.select({
      id: masterSummaryDetails.id,
      centerName: masterSummaryDetails.centerName,
      centerNumber: masterSummaryDetails.centerNumber,
      medium: masterSummaryDetails.medium,
      registered: masterSummaryDetails.registered,
      regionName: regions.regionName,
      districtName: districts.districtName,
    })
    .from(masterSummaryDetails)
    .leftJoin(regions, eq(masterSummaryDetails.regionId, regions.id))
    .leftJoin(districts, eq(masterSummaryDetails.districtId, districts.id))
    .where(and(eq(masterSummaryDetails.mid, id), eq(masterSummaryDetails.isLatest, true)))
    .orderBy(asc(masterSummaryDetails.centerNumber))
    .limit(limit).offset(offset);

    res.json({ summary: summary[0], details, page, limit, total, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch master summary details' });
  }
});

// POST /api/master-summaries — create header
router.post('/', requirePermission('master_summaries:write'), async (req, res) => {
  try {
    const { examination, code, year } = req.body;

    // Deactivate any previous latest version for same code+year
    await db.update(masterSummaries)
      .set({ isLatest: false })
      .where(and(eq(masterSummaries.code, code), eq(masterSummaries.year, year)));

    // Get next version
    const prev = await db.select({ version: masterSummaries.version })
      .from(masterSummaries)
      .where(and(eq(masterSummaries.code, code), eq(masterSummaries.year, year)))
      .orderBy(desc(masterSummaries.version))
      .limit(1);
    const nextVersion = prev.length ? prev[0].version + 1 : 1;

    const [created] = await db.insert(masterSummaries).values({
      examination, code, year, version: nextVersion, isLatest: true,
    }).returning();

    await auditLog({ tableName: 'master_summaries', recordId: created.id, actionType: 'INSERT', newData: created, changedBy: req.user?.id });
    res.status(201).json({ data: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create master summary' });
  }
});

// POST /api/master-summaries/:id/details/bulk — bulk insert center rows
router.post('/:id/details/bulk', requirePermission('master_summaries:write'), async (req, res) => {
  try {
    const mid = Number(req.params.id);
    const { rows }: { rows: Array<{
      centerName: string; centerNumber: string; medium?: string; registered?: number;
      regionId?: number; districtId?: number; version: number;
    }> } = req.body;

    if (!rows?.length) return res.status(400).json({ error: 'No rows provided' });

    const inserted = await db.insert(masterSummaryDetails).values(
      rows.map(r => ({ ...r, mid, isLatest: true }))
    ).returning();

    await auditLog({ tableName: 'master_summary_details', recordId: mid, actionType: 'IMPORT', newData: { count: inserted.length }, changedBy: req.user?.id });
    res.status(201).json({ inserted: inserted.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import center rows' });
  }
});

// DELETE /api/master-summaries/:id
router.delete('/:id', requirePermission('master_summaries:delete'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const old = await db.select().from(masterSummaries).where(eq(masterSummaries.id, id)).limit(1);
    await db.delete(masterSummaries).where(eq(masterSummaries.id, id));
    await auditLog({ tableName: 'master_summaries', recordId: id, actionType: 'DELETE', oldData: old[0], changedBy: req.user?.id });
    res.json({ message: 'Master summary deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete master summary' });
  }
});

export default router;
