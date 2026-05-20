import { Router } from 'express';
import { db } from '../db';
import { teachers, regions, districts, jobAssignments, teacherJobAssignments } from '../db/schema';
import { eq, ilike, count, asc, or, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

// GET /api/teachers
router.get('/', requirePermission('supervisors:view'), async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;

    let baseQuery = db.select({
      id: teachers.id,
      teacherName: teachers.teacherName,
      checkNumber: teachers.checkNumber,
      workstation: teachers.workstation,
      phone: teachers.phone,
      bankName: teachers.bankName,
      indexNo: teachers.indexNo,
      regionName: regions.regionName,
      districtName: districts.districtName,
    })
    .from(teachers)
    .leftJoin(regions, eq(teachers.regionId, regions.id))
    .leftJoin(districts, eq(teachers.districtId, districts.id));

    const conditions: any[] = [];
    if (search) conditions.push(or(
      ilike(teachers.teacherName, `%${search}%`),
      ilike(teachers.checkNumber, `%${search}%`),
    ));
    if (regionId) conditions.push(eq(teachers.regionId, regionId));
    if (conditions.length) baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;

    const totalResult = await db.select({ count: count() }).from(teachers);
    const total = totalResult[0]?.count ?? 0;

    const data = await baseQuery.orderBy(asc(teachers.teacherName)).limit(limit).offset(offset);
    res.json({ data, page, limit, total, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// POST /api/teachers
router.post('/', requirePermission('supervisors:write'), async (req, res) => {
  try {
    const [created] = await db.insert(teachers).values(req.body).returning();
    await auditLog({ tableName: 'teachers', recordId: created.id, actionType: 'INSERT', newData: created, changedBy: req.user?.id });
    res.status(201).json({ data: created });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Check number already exists' });
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// POST /api/teachers/bulk
router.post('/bulk', requirePermission('supervisors:write'), async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows?.length) return res.status(400).json({ error: 'No rows provided' });
    const inserted = await db.insert(teachers).values(rows).onConflictDoNothing().returning();
    res.status(201).json({ inserted: inserted.length, skipped: rows.length - inserted.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk import teachers' });
  }
});

// PUT /api/teachers/:id
router.put('/:id', requirePermission('supervisors:write'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db.update(teachers).set(req.body).where(eq(teachers.id, id)).returning();
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update teacher' });
  }
});

// DELETE /api/teachers/:id
router.delete('/:id', requirePermission('supervisors:delete'), async (req, res) => {
  try {
    await db.delete(teachers).where(eq(teachers.id, Number(req.params.id)));
    res.json({ message: 'Teacher deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

// ─── JOB ASSIGNMENTS ─────────────────────────────────────────────────────────

// GET /api/teachers/jobs
router.get('/jobs', requirePermission('supervisors:view'), async (req, res) => {
  const data = await db.select().from(jobAssignments).orderBy(asc(jobAssignments.name));
  res.json({ data });
});

// POST /api/teachers/jobs
router.post('/jobs', requirePermission('supervisors:write'), async (req, res) => {
  try {
    const [created] = await db.insert(jobAssignments).values(req.body).returning();
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job assignment' });
  }
});

// PUT /api/teachers/jobs/:id/assign — add teachers to a job
router.put('/jobs/:id/assign', requirePermission('supervisors:write'), async (req, res) => {
  try {
    const jobId = req.params.id;
    const { teacherIds }: { teacherIds: number[] } = req.body;
    const inserted = await db.insert(teacherJobAssignments)
      .values(teacherIds.map(tid => ({ jobId, teacherId: tid })))
      .onConflictDoNothing()
      .returning();
    res.json({ assigned: inserted.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign teachers' });
  }
});

export default router;
