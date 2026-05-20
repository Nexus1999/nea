import { Request, Response, NextFunction } from 'express';

export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // ADMINISTRATOR bypasses all permission checks
    if (req.user.roleName?.toUpperCase() === 'ADMINISTRATOR') {
      return next();
    }

    if (!req.user.permissions?.includes(requiredPermission)) {
      return res.status(403).json({ error: `Forbidden: requires ${requiredPermission} permission` });
    }

    next();
  };
};
