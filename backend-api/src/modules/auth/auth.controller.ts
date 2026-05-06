import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AuthenticatedRequest } from '../../types';

const verifySuccessHtml = (name: string) => `
<!DOCTYPE html><html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>E-mail Confirmado — Studio Fernanda Correa</title>
  <style>
    body{margin:0;padding:24px;background:#f9fafb;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box;}
    .card{max-width:420px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:40px 32px;text-align:center;}
    .icon{font-size:48px;margin-bottom:16px;}
    h1{color:#C9A4A0;font-size:22px;margin:0 0 12px;}
    p{color:#6b7280;line-height:1.6;margin:0 0 12px;}
    .brand{color:#9ca3af;font-size:13px;margin-top:24px;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Studio Fernanda Correa</h1>
    <p><strong>Olá, ${name}!</strong></p>
    <p>Seu e-mail foi confirmado com sucesso. Volte ao aplicativo e faça login com suas credenciais.</p>
    <p class="brand">Beleza com sofisticação</p>
  </div>
</body>
</html>`;

const verifyErrorHtml = `
<!DOCTYPE html><html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Link Inválido — Studio Fernanda Correa</title>
  <style>
    body{margin:0;padding:24px;background:#f9fafb;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box;}
    .card{max-width:420px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:40px 32px;text-align:center;}
    .icon{font-size:48px;margin-bottom:16px;}
    h1{color:#C9A4A0;font-size:22px;margin:0 0 12px;}
    p{color:#6b7280;line-height:1.6;margin:0;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>Studio Fernanda Correa</h1>
    <p>Este link é inválido ou expirou. Solicite um novo e-mail de confirmação no aplicativo.</p>
  </div>
</body>
</html>`;

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body);

      if (result.emailVerificationRequired) {
        res.status(200).json({
          data: { emailVerificationRequired: true, email: result.email },
          message: 'Conta criada! Verifique seu e-mail para ativar sua conta.',
        });
        return;
      }

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
      const isVerificationError = message.includes('não ativada');
      res.status(isVerificationError ? 403 : 401).json({
        error: isVerificationError ? 'EmailNotVerified' : 'AuthError',
        message,
      });
    }
  },

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const token = req.query.token as string;

    if (!token) {
      res.status(400).send(verifyErrorHtml);
      return;
    }

    try {
      const { name } = await authService.verifyEmail(token);
      res.send(verifySuccessHtml(name));
    } catch {
      res.status(400).send(verifyErrorHtml);
    }
  },

  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      await authService.resendVerification(req.body.email);
      res.json({ data: null, message: 'E-mail de verificação reenviado.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao reenviar e-mail.';
      res.status(400).json({ error: 'ResendError', message });
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
    res.json({ data: null, message: 'Logout realizado.' });
  },
};
