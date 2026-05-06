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

const resetFormHtml = (token: string, error?: string) => `
<!DOCTYPE html><html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Redefinir Senha — Studio Fernanda Correa</title>
  <style>
    *{box-sizing:border-box;}
    body{margin:0;padding:24px;background:#f9fafb;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
    .card{max-width:420px;width:100%;background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:40px 32px;}
    h1{color:#C9A4A0;font-size:20px;margin:0 0 8px;text-align:center;}
    .sub{color:#9ca3af;font-size:13px;text-align:center;margin:0 0 24px;}
    label{display:block;font-size:13px;color:#374151;font-weight:600;margin-bottom:6px;}
    input{width:100%;padding:12px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;outline:none;transition:border .15s;}
    input:focus{border-color:#C9A4A0;}
    .hint{font-size:12px;color:#9ca3af;margin:4px 0 16px;}
    button{width:100%;background:#C9A4A0;color:#fff;border:none;border-radius:8px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;margin-top:8px;}
    button:hover{background:#b8918d;}
    .error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:8px;padding:12px;font-size:13px;margin-bottom:16px;}
    .brand{color:#d1d5db;font-size:12px;text-align:center;margin-top:24px;}
  </style>
</head>
<body>
  <div class="card">
    <h1>Studio Fernanda Correa</h1>
    <p class="sub">Crie uma nova senha para sua conta</p>
    ${error ? `<div class="error">${error}</div>` : ''}
    <form method="POST" action="/api/auth/reset-password">
      <input type="hidden" name="token" value="${token}"/>
      <label for="password">Nova senha</label>
      <input type="password" id="password" name="password" placeholder="Mínimo 8 caracteres" required minlength="8"/>
      <label for="confirm" style="margin-top:4px;">Confirmar nova senha</label>
      <input type="password" id="confirm" name="confirm" placeholder="Repita a senha" required minlength="8"/>
      <p class="hint">Mínimo 8 caracteres.</p>
      <button type="submit">Redefinir senha</button>
    </form>
    <p class="brand">© Studio Fernanda Correa · Beleza com sofisticação</p>
  </div>
  <script>
    document.querySelector('form').addEventListener('submit', function(e) {
      const p = document.getElementById('password').value;
      const c = document.getElementById('confirm').value;
      if (p !== c) { e.preventDefault(); alert('As senhas não coincidem.'); }
    });
  </script>
</body>
</html>`;

const resetSuccessHtml = `
<!DOCTYPE html><html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Senha Redefinida — Studio Fernanda Correa</title>
  <style>
    body{margin:0;padding:24px;background:#f9fafb;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
    .card{max-width:420px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:40px 32px;text-align:center;}
    .icon{font-size:48px;margin-bottom:16px;}
    h1{color:#C9A4A0;font-size:22px;margin:0 0 12px;}
    p{color:#6b7280;line-height:1.6;margin:0 0 12px;}
    .brand{color:#9ca3af;font-size:13px;margin-top:24px;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔐</div>
    <h1>Studio Fernanda Correa</h1>
    <p><strong>Senha redefinida com sucesso!</strong></p>
    <p>Volte ao aplicativo e faça login com sua nova senha.</p>
    <p class="brand">Beleza com sofisticação</p>
  </div>
</body>
</html>`;

const resetErrorHtml = `
<!DOCTYPE html><html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Link Inválido — Studio Fernanda Correa</title>
  <style>
    body{margin:0;padding:24px;background:#f9fafb;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
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
    <p>Este link é inválido ou expirou. Solicite uma nova recuperação de senha no aplicativo.</p>
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

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      await authService.forgotPassword(req.body.email);
      res.json({ data: null, message: 'Link de recuperação enviado! Verifique seu e-mail.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar solicitação.';
      res.status(400).json({ error: 'ForgotPasswordError', message });
    }
  },

  async resetPasswordForm(req: Request, res: Response): Promise<void> {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).send(resetErrorHtml);
      return;
    }
    res.send(resetFormHtml(token));
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password, confirm } = req.body;

    if (!token) {
      res.status(400).send(resetErrorHtml);
      return;
    }

    if (!password || password.length < 8) {
      res.send(resetFormHtml(token, 'A senha deve ter no mínimo 8 caracteres.'));
      return;
    }

    if (password !== confirm) {
      res.send(resetFormHtml(token, 'As senhas não coincidem.'));
      return;
    }

    try {
      await authService.resetPassword(token, password);
      res.send(resetSuccessHtml);
    } catch {
      res.status(400).send(resetErrorHtml);
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
