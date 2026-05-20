import { Router } from 'express';
import { db } from '../db';
import { examinations, subjects } from '../db/schema';
import { eq, ilike, count, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

// GET /api/examinations
router.get('/', async (req, res) => {
  try {
    const data = await db.select().from(examinations).orderBy(asc(examinations.code));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch examinations' });
  }
});

// POST /api/examinations
router.post('/', requirePermission('users:write'), async (req, res) => {
  try {
    const { examination, code, level, status } = req.body;
    const [created] = await db.insert(examinations).values({ examination, code, level, status }).returning();
    await auditLog({ tableName: 'examinations', recordId: created.id, actionType: 'INSERT', newData: created, changedBy: req.user?.id });
    res.status(201).json({ data: created });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Examination code already exists' });
    res.status(500).json({ error: 'Failed to create examination' });
  }
});

// PUT /api/examinations/:id
router.put('/:id', requirePermission('users:write'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { examination, code, level, status } = req.body;
    const [updated] = await db.update(examinations).set({ examination, code, level, status }).where(eq(examinations.id, id)).returning();
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update examination' });
  }
});

// DELETE /api/examinations/:id
router.delete('/:id', requirePermission('users:delete'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(examinations).where(eq(examinations.id, id));
    res.json({ message: 'Examination deleted' });
  } catch (err: any) {
    if (err.code === '23503') return res.status(409).json({ error: 'Cannot delete — examination has linked records' });
    res.status(500).json({ error: 'Failed to delete examination' });
  }
});

// Subjects sub-routes
// GET /api/examinations/:code/subjects
router.get('/:code/subjects', async (req, res) => {
  const data = await db.select().from(subjects).where(eq(subjects.examCode, req.params.code)).orderBy(asc(subjects.subjectCode));
  res.json({ data });
});

// POST /api/examinations/:code/subjects
router.post('/:code/subjects', requirePermission('users:write'), async (req, res) => {
  try {
    const { subjectCode, subjectName } = req.body;
    const [created] = await db.insert(subjects).values({ subjectCode, subjectName, examCode: req.params.code }).returning();
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// DELETE /api/examinations/subjects/:id
router.delete('/subjects/:id', requirePermission('users:delete'), async (req, res) => {
  try {
    await db.delete(subjects).where(eq(subjects.id, Number(req.params.id)));
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

export default router;
