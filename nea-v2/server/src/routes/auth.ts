import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { profiles, roles, rolePermissions, permissions, sessions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { signToken } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';
import { auditLog } from '../utils/audit';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const userResult = await db.select().from(profiles).where(eq(profiles.username, username)).limit(1);
    
    if (!userResult.length) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = userResult[0];

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      roleId: user.roleId!
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Record Session
    await db.insert(sessions).values({
      userId: user.id,
      token: token,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    // Log Audit
    await auditLog({
      tableName: 'profiles',
      recordId: user.id,
      actionType: 'LOGIN',
      newData: { username: user.username, ip: req.ip },
      changedBy: user.id
    });

    res.json({ success: true, message: 'Logged in successfully', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (token) {
      const session = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
      if (session.length) {
        await auditLog({
          tableName: 'sessions',
          recordId: session[0].id,
          actionType: 'LOGOUT',
          changedBy: session[0].userId
        });
        await db.delete(sessions).where(eq(sessions.token, token));
      }
    }
  } catch (err) {
    console.error('Logout session cleanup error:', err);
  }
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  // TODO: Implement actual email sending logic
  console.log(`Password reset requested for: ${email}`);
  
  await auditLog({
    tableName: 'profiles',
    recordId: 'N/A',
    actionType: 'UPDATE',
    newData: { action: 'password_reset_request', email },
  });

  res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: req.user
  });
});

router.post('/update-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    if (!user.length) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user[0].passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Current password incorrect' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.update(profiles).set({ passwordHash: newHash }).where(eq(profiles.id, userId));

    await auditLog({
      tableName: 'profiles',
      recordId: userId,
      actionType: 'UPDATE',
      newData: { action: 'password_change_self' },
      changedBy: userId
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
