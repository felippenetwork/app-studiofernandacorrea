import nodemailer from 'nodemailer';
import { env } from '../config/env';

const hasSmtp = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

const FROM = env.SMTP_FROM ?? env.SMTP_USER ?? 'noreply@studiofernandacorrea.com.br';

function baseTemplate(content: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:24px;background:#f9fafb;">
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#C9A4A0;font-size:22px;margin:0;letter-spacing:2px;">Studio Fernanda Correa</h1>
        <p style="color:#9ca3af;font-size:13px;margin:4px 0 0;">Beleza com sofisticação</p>
      </div>
      ${content}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
      <p style="color:#d1d5db;font-size:12px;text-align:center;margin:0;">
        © ${year} Studio Fernanda Correa · Todos os direitos reservados.
      </p>
    </div>
  </body></html>`;
}

export const emailService = {
  hasSmtp,

  async sendEmailVerification(to: string, name: string, token: string): Promise<void> {
    if (!transporter || !env.API_BASE_URL) return;
    const verifyUrl = `${env.API_BASE_URL}/auth/verify-email?token=${token}`;
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Confirme seu e-mail — Studio Fernanda Correa',
      html: baseTemplate(`
        <h2 style="color:#111827;font-size:18px;margin-top:0;">Olá, ${name}!</h2>
        <p style="color:#6b7280;line-height:1.6;">Obrigada por se cadastrar! Para ativar sua conta e acessar o aplicativo, confirme seu e-mail clicando no botão abaixo:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyUrl}" style="background:#C9A4A0;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
            Confirmar e-mail
          </a>
        </div>
        <p style="color:#9ca3af;font-size:13px;line-height:1.5;">
          Se você não criou uma conta, pode ignorar este e-mail.<br/>
          O link expira em 24 horas.
        </p>
      `),
    });
  },

  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    if (!transporter || !env.API_BASE_URL) return;
    const resetUrl = `${env.API_BASE_URL}/auth/reset-password?token=${token}`;
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Recuperação de senha — Studio Fernanda Correa',
      html: baseTemplate(`
        <h2 style="color:#111827;font-size:18px;margin-top:0;">Olá, ${name}!</h2>
        <p style="color:#6b7280;line-height:1.6;">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}" style="background:#C9A4A0;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
            Redefinir senha
          </a>
        </div>
        <p style="color:#9ca3af;font-size:13px;line-height:1.5;">
          Se você não solicitou a recuperação de senha, ignore este e-mail — sua senha não será alterada.<br/>
          O link expira em 1 hora.
        </p>
      `),
    });
  },

  async sendWelcome(to: string, name: string): Promise<void> {
    if (!transporter) return;
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Bem-vinda ao Studio Fernanda Correa!',
      html: baseTemplate(`
        <h2 style="color:#111827;font-size:18px;margin-top:0;">Bem-vinda, ${name}!</h2>
        <p style="color:#6b7280;line-height:1.6;">Sua conta foi confirmada com sucesso. Agora você pode acessar o aplicativo e aproveitar todos os nossos serviços de beleza.</p>
        <p style="color:#6b7280;line-height:1.6;">Agende seus serviços favoritos, acesse cupons exclusivos e muito mais!</p>
      `),
    });
  },
};
