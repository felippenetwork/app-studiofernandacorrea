import { Request, Response, NextFunction } from 'express';
import { adminAuthService } from '../modules/admin-auth/admin-auth.service';

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Token de admin não fornecido.' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = adminAuthService.verifyToken(token);

    if ((payload as any).type !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Acesso negado.' });
      return;
    }

    (req as any).adminUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', message: 'Token inválido ou expirado.' });
  }
}

// Role-based access control factory
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = (req as any).adminUser;
    if (!admin || !roles.includes(admin.role)) {
      res.status(403).json({ error: 'Forbidden', message: 'Permissão insuficiente.' });
      return;
    }
    next();
  };
}
