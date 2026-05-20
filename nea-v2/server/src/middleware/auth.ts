import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { db } from '../db';
import { profiles, roles, rolePermissions, permissions, sessions } from '../db/schema';
import { eq } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & {
        roleName?: string;
        permissions?: string[];
      };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Strict Session Check
    const sessionResult = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    if (!sessionResult.length || new Date(sessionResult[0].expiresAt!) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Update Session Activity
    await db.update(sessions).set({
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // Extend by 15 mins
    }).where(eq(sessions.token, token));

    // Fetch user details and permissions to attach to req
    const userProfile = await db.select({
      id: profiles.id,
      username: profiles.username,
      roleId: profiles.roleId,
      status: profiles.status,
    }).from(profiles).where(eq(profiles.id, payload.id)).limit(1);

    if (!userProfile.length || userProfile[0].status !== 'active') {
      return res.status(401).json({ error: 'User is inactive or not found' });
    }

    const u = userProfile[0];
    let roleName = '';
    const userPerms: string[] = [];

    if (u.roleId) {
      const roleResult = await db.select().from(roles).where(eq(roles.id, u.roleId)).limit(1);
      if (roleResult.length) {
        roleName = roleResult[0].name;
      }

      // Fetch permissions
      const perms = await db.select({
        name: permissions.name
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, u.roleId));

      perms.forEach(p => userPerms.push(p.name));
    }

    req.user = {
      id: u.id,
      username: u.username,
      roleId: u.roleId!,
      roleName,
      permissions: userPerms
    };

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
