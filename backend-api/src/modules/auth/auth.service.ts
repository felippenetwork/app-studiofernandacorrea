import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env, hasSupabase } from '../../config/env';
import { supabase } from '../../config/supabase';
import { emailService } from '../../services/email.service';
import { birthdayService } from '../birthday/birthday.service';
import { AuthTokens, DbUser } from '../../types';
import { RegisterInput, LoginInput } from './auth.validator';

const SALT_ROUNDS = 12;

// ─── Token helpers ────────────────────────────────────────────────────────────

function generateTokens(user: Pick<DbUser, 'id' | 'email' | 'name'>): AuthTokens {
  const payload = { email: user.email, name: user.name };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
}

function sanitizeUser(user: DbUser) {
  const { password_hash: _, ...safe } = user;
  return safe;
}

// ─── Mock store (dev without Supabase) ────────────────────────────────────────

const mockUsers: DbUser[] = [];

// ─── Service ─────────────────────────────────────────────────────────────────

type RegisterResult =
  | { emailVerificationRequired: true; email: string }
  | { emailVerificationRequired: false; user: ReturnType<typeof sanitizeUser>; tokens: AuthTokens };

export const authService = {
  async register(input: RegisterInput): Promise<RegisterResult> {
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    if (!hasSupabase) {
      const existing = mockUsers.find((u) => u.email === input.email);
      if (existing) throw new Error('E-mail já cadastrado.');

      const user: DbUser = {
        id: `mock-${Date.now()}`,
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        avatar_url: null,
        password_hash: passwordHash,
        birth_date: input.birth_date ?? null,
        accepts_marketing: input.accepts_marketing ?? false,
        accepts_push: input.accepts_push ?? true,
        is_vip: false,
        is_blocked: false,
        internal_notes: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockUsers.push(user);
      return { emailVerificationRequired: false, user: sanitizeUser(user), tokens: generateTokens(user) };
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', input.email)
      .maybeSingle();

    if (existing) throw new Error('E-mail já cadastrado.');

    const needsVerification = emailService.hasSmtp;
    const verificationToken = needsVerification
      ? crypto.randomBytes(32).toString('hex')
      : null;

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        password_hash: passwordHash,
        birth_date: input.birth_date ?? null,
        accepts_marketing: input.accepts_marketing ?? false,
        accepts_push: input.accepts_push ?? true,
        is_active: !needsVerification,
        email_verification_token: verificationToken,
        email_verified_at: needsVerification ? null : new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !user) throw new Error('Erro ao criar conta. Tente novamente.');

    if (needsVerification && verificationToken) {
      emailService
        .sendEmailVerification(input.email, input.name, verificationToken)
        .catch(console.error);

      return { emailVerificationRequired: true, email: input.email };
    }

    // Fire-and-forget birthday check — if today is their birthday, send coupon now
    if (input.birth_date) {
      birthdayService
        .onUserBirthdateChanged((user as DbUser).id, input.name, input.birth_date)
        .catch(console.error);
    }

    return {
      emailVerificationRequired: false,
      user: sanitizeUser(user as DbUser),
      tokens: generateTokens(user as DbUser),
    };
  },

  async login(input: LoginInput) {
    if (!hasSupabase) {
      const user = mockUsers.find((u) => u.email === input.email);
      if (!user) throw new Error('E-mail ou senha incorretos.');
      const valid = await bcrypt.compare(input.password, user.password_hash);
      if (!valid) throw new Error('E-mail ou senha incorretos.');
      return { user: sanitizeUser(user), tokens: generateTokens(user) };
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', input.email)
      .maybeSingle();

    if (!user) throw new Error('E-mail ou senha incorretos.');

    const dbUser = user as DbUser;

    if (!dbUser.is_active) {
      throw new Error('Conta não ativada. Verifique seu e-mail para confirmar o cadastro.');
    }

    if (dbUser.is_blocked) {
      throw new Error('Sua conta foi suspensa. Entre em contato com o Studio Fernanda Correa para mais informações.');
    }

    const valid = await bcrypt.compare(input.password, dbUser.password_hash);
    if (!valid) throw new Error('E-mail ou senha incorretos.');

    return { user: sanitizeUser(dbUser), tokens: generateTokens(dbUser) };
  },

  async verifyEmail(token: string) {
    if (!hasSupabase) throw new Error('Verificação não disponível em modo dev.');

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email_verification_token', token)
      .maybeSingle();

    if (!user) throw new Error('Link inválido ou expirado.');

    await supabase
      .from('users')
      .update({
        is_active: true,
        email_verified_at: new Date().toISOString(),
        email_verification_token: null,
      })
      .eq('id', (user as any).id);

    // Send welcome email asynchronously
    emailService
      .sendWelcome((user as any).email, (user as any).name)
      .catch(console.error);

    return { name: (user as any).name, email: (user as any).email };
  },

  async resendVerification(email: string) {
    if (!hasSupabase) throw new Error('Verificação não disponível em modo dev.');
    if (!emailService.hasSmtp) throw new Error('Serviço de e-mail não configurado.');

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, is_active')
      .eq('email', email)
      .maybeSingle();

    if (!user) throw new Error('E-mail não encontrado.');
    if ((user as any).is_active) throw new Error('Conta já verificada. Faça login normalmente.');

    const newToken = crypto.randomBytes(32).toString('hex');

    await supabase
      .from('users')
      .update({ email_verification_token: newToken })
      .eq('id', (user as any).id);

    await emailService.sendEmailVerification(email, (user as any).name, newToken);
  },

  async forgotPassword(email: string) {
    if (!hasSupabase) throw new Error('Recuperação de senha não disponível em modo dev.');
    if (!emailService.hasSmtp) throw new Error('Serviço de e-mail não configurado.');

    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, is_active')
      .eq('email', email)
      .maybeSingle();

    if (!user) throw new Error('E-mail não encontrado. Verifique o endereço informado.');
    if (!(user as any).is_active) throw new Error('Conta não ativada. Verifique seu e-mail para confirmar o cadastro.');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

    await supabase
      .from('users')
      .update({ password_reset_token: token, password_reset_expires_at: expiresAt })
      .eq('id', (user as any).id);

    emailService
      .sendPasswordReset(email, (user as any).name, token)
      .catch(console.error);
  },

  async resetPassword(token: string, newPassword: string) {
    if (!hasSupabase) throw new Error('Recuperação de senha não disponível em modo dev.');

    const { data: user } = await supabase
      .from('users')
      .select('id, password_reset_expires_at')
      .eq('password_reset_token', token)
      .maybeSingle();

    if (!user) throw new Error('Link inválido ou expirado.');

    const expiresAt = new Date((user as any).password_reset_expires_at).getTime();
    if (Date.now() > expiresAt) throw new Error('Link inválido ou expirado.');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires_at: null,
      })
      .eq('id', (user as any).id);
  },

  async getUserById(id: string) {
    if (!hasSupabase) {
      const user = mockUsers.find((u) => u.id === id);
      if (!user) throw new Error('Usuário não encontrado.');
      return sanitizeUser(user);
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, avatar_url, birth_date, accepts_marketing, accepts_push, is_vip, is_blocked, is_active, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !user) throw new Error('Usuário não encontrado.');
    return user;
  },

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
      const user = await authService.getUserById(payload.sub);
      return generateTokens(user as DbUser);
    } catch {
      throw new Error('Refresh token inválido ou expirado.');
    }
  },
};
