import { Router } from 'express';
import { db } from '../db';
import { profiles, roles, rolePermissions, permissions, sessions } from '../db/schema';
import { eq, ilike, count, asc, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import bcrypt from 'bcrypt';
import { auditLog } from '../utils/audit';

const router = Router();
router.use(requireAuth);

// ─── USERS ────────────────────────────────────────────────────────────────────

// GET /api/security/users/:id
router.get('/users/:id', requirePermission('users:view'), async (req, res) => {
  try {
    const data = await db.select({
      id: profiles.id,
      username: profiles.username,
      email: profiles.email,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      avatarUrl: profiles.avatarUrl,
      phoneNumber: profiles.phoneNumber,
      dateOfBirth: profiles.dateOfBirth,
      status: profiles.status,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
      roleId: profiles.roleId,
      roleName: roles.name,
    })
    .from(profiles)
    .leftJoin(roles, eq(profiles.roleId, roles.id))
    .where(eq(profiles.id, req.params.id))
    .limit(1);

    if (!data.length) return res.status(404).json({ error: 'User not found' });
    res.json({ data: data[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/security/users
router.get('/users', requirePermission('users:view'), async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 15;
    const offset = (page - 1) * limit;

    const data = await db.select({
      id: profiles.id,
      username: profiles.username,
      email: profiles.email,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      avatarUrl: profiles.avatarUrl,
      phoneNumber: profiles.phoneNumber,
      dateOfBirth: profiles.dateOfBirth,
      status: profiles.status,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
      roleId: profiles.roleId,
      roleName: roles.name,
    })
    .from(profiles)
    .leftJoin(roles, eq(profiles.roleId, roles.id))
    .orderBy(asc(profiles.username))
    .limit(limit).offset(offset);

    const totalResult = await db.select({ count: count() }).from(profiles);
    const total = totalResult[0]?.count ?? 0;

    res.json({ data, page, limit, total, totalPages: Math.ceil(Number(total) / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/security/users
router.post('/users', requirePermission('users:write'), async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, roleId, status } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const [created] = await db.insert(profiles).values({ username, email, passwordHash, firstName, lastName, roleId, status }).returning();
    const { passwordHash: _ph, ...safeUser } = created as any;
    await auditLog({ tableName: 'profiles', recordId: created.id, actionType: 'INSERT', newData: safeUser, changedBy: req.user?.id });
    res.status(201).json({ data: safeUser });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/security/users/:id
router.put('/users/:id', requirePermission('users:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, roleId, status } = req.body;
    const old = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    const [updated] = await db.update(profiles).set({ firstName, lastName, email, roleId, status }).where(eq(profiles.id, id)).returning();
    const { passwordHash: _ph, ...safeUser } = updated as any;
    await auditLog({ tableName: 'profiles', recordId: id, actionType: 'UPDATE', oldData: old[0], newData: safeUser, changedBy: req.user?.id });
    res.json({ data: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PUT /api/security/users/:id/reset-password
router.put('/users/:id/reset-password', requirePermission('users:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(profiles).set({ passwordHash }).where(eq(profiles.id, id));
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/security/users/:id
router.delete('/users/:id', requirePermission('users:delete'), async (req, res) => {
  try {
    await db.delete(profiles).where(eq(profiles.id, req.params.id));
    res.json({ message: 'User deleted' });
  } catch (err: any) {
    if (err.code === '23503') return res.status(409).json({ error: 'Cannot delete — user has linked records' });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── ROLES ────────────────────────────────────────────────────────────────────

// GET /api/security/roles
router.get('/roles', requirePermission('roles:view'), async (req, res) => {
  const data = await db.select().from(roles).orderBy(asc(roles.name));
  res.json({ data });
});

// POST /api/security/roles
router.post('/roles', requirePermission('roles:write'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const [created] = await db.insert(roles).values({ name, description }).returning();
    await auditLog({ tableName: 'roles', recordId: created.id, actionType: 'INSERT', newData: created, changedBy: req.user?.id });
    res.status(201).json({ data: created });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Role name already exists' });
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// PUT /api/security/roles/:id
router.put('/roles/:id', requirePermission('roles:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const old = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    const [updated] = await db.update(roles).set({ name, description }).where(eq(roles.id, id)).returning();
    await auditLog({ tableName: 'roles', recordId: id, actionType: 'UPDATE', oldData: old[0], newData: updated, changedBy: req.user?.id });
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/security/roles/:id
router.delete('/roles/:id', requirePermission('roles:write'), async (req, res) => {
  try {
    await db.delete(roles).where(eq(roles.id, req.params.id));
    res.json({ message: 'Role deleted' });
  } catch (err: any) {
    if (err.code === '23503') return res.status(409).json({ error: 'Cannot delete — role is in use' });
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// ─── PERMISSIONS ──────────────────────────────────────────────────────────────

// GET /api/security/permissions
router.get('/permissions', requirePermission('permissions:view'), async (req, res) => {
  const data = await db.select().from(permissions).orderBy(asc(permissions.name));
  res.json({ data });
});

// POST /api/security/permissions
router.post('/permissions', requirePermission('roles:write'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const [created] = await db.insert(permissions).values({ name, description }).returning();
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create permission' });
  }
});

// PUT /api/security/permissions/:id
router.put('/permissions/:id', requirePermission('roles:write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const [updated] = await db.update(permissions).set({ name, description }).where(eq(permissions.id, id)).returning();
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

// DELETE /api/security/permissions/:id
router.delete('/permissions/:id', requirePermission('roles:write'), async (req, res) => {
  try {
    await db.delete(permissions).where(eq(permissions.id, req.params.id));
    res.json({ message: 'Permission deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete permission' });
  }
});

// PUT /api/security/roles/:id/permissions — Replace entire permission set
router.put('/roles/:id/permissions', requirePermission('roles:write'), async (req, res) => {
  try {
    const roleId = req.params.id;
    const { permissionIds }: { permissionIds: string[] } = req.body;
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (permissionIds.length) {
      await db.insert(rolePermissions).values(permissionIds.map(pid => ({ roleId, permissionId: pid })));
    }
    await auditLog({ 
      tableName: 'role_permissions', 
      recordId: roleId, 
      actionType: 'UPDATE', 
      newData: { permissionIds }, 
      changedBy: req.user?.id 
    });
    res.json({ message: 'Permissions updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// GET /api/security/role-permissions — Get all mappings for matrix
router.get('/role-permissions', requirePermission('roles:view'), async (req, res) => {
  try {
    const data = await db.select().from(rolePermissions);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

// GET /api/security/sessions
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const targetUserId = req.query.userId as string | undefined;
    
    // If not admin, can only see own sessions
    const isAdmin = req.user?.roleName?.toUpperCase() === 'ADMINISTRATOR';
    const finalUserId = isAdmin ? targetUserId : req.user?.id;

    let query = db.select({
      id: sessions.id,
      username: profiles.username,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
      expiresAt: sessions.expiresAt,
      lastActivity: sessions.lastActivity,
      createdAt: sessions.createdAt
    })
    .from(sessions)
    .leftJoin(profiles, eq(sessions.userId, profiles.id));

    if (finalUserId) {
      query = query.where(eq(sessions.userId, finalUserId)) as typeof query;
    }

    const data = await query.orderBy(desc(sessions.createdAt)).limit(50);
    const enrichedData = data.map(s => ({
      ...s,
      status: new Date(s.expiresAt!) > new Date() ? 'ACTIVE' : 'EXPIRED'
    }));
    res.json({ data: enrichedData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// DELETE /api/security/sessions/:id
router.delete('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.roleName?.toUpperCase() === 'ADMINISTRATOR';

    const session = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    if (!session.length) return res.status(404).json({ error: 'Session not found' });

    if (!isAdmin && session[0].userId !== req.user?.id) {
      return res.status(403).json({ error: 'Unauthorized to terminate this session' });
    }

    await db.delete(sessions).where(eq(sessions.id, id));

    await auditLog({
      tableName: 'sessions',
      recordId: id,
      actionType: 'DELETE',
      oldData: session[0],
      changedBy: req.user?.id
    });

    res.json({ message: 'Session terminated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to terminate session' });
  }
});

export default router;
