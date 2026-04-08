import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AuthenticatedRequest } from '../../types';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        data: result,
        message: 'Conta criada com sucesso!',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta.';
      const status = message.includes('já cadastrado') ? 409 : 500;
      res.status(status).json({ error: 'RegisterError', message });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.json({ data: result, message: 'Login realizado com sucesso.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login.';
      res.status(401).json({ error: 'AuthError', message });
    }
  },

  async me(req: Request, res: Response): Promise<void> {
    try {
      const { id } = (req as AuthenticatedRequest).user;
      const user = await authService.getUserById(id);
      res.json({ data: user });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar perfil.';
      res.status(404).json({ error: 'NotFound', message });
    }
  },

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const tokens = await authService.refreshTokens(req.body.refreshToken);
      res.json({ data: tokens });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token inválido.';
      res.status(401).json({ error: 'AuthError', message });
    }
  },

  async logout(_req: Request, res: Response): Promise<void> {
    // Stateless JWT — client simply discards tokens
    res.json({ data: null, message: 'Logout realizado.' });
  },
};
