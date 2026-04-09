import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env, hasSupabase } from '../../config/env';
import { supabase } from '../../config/supabase';
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

// ─── Mock store (used when Supabase is not configured) ────────────────────────

const mockUsers: DbUser[] = [];

// ─── Service ─────────────────────────────────────────────────────────────────

export const authService = {
  async register(input: RegisterInput) {
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
      return { user: sanitizeUser(user), tokens: generateTokens(user) };
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', input.email)
      .maybeSingle();

    if (existing) throw new Error('E-mail já cadastrado.');

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
      })
      .select()
      .single();

    if (error || !user) throw new Error('Erro ao criar conta. Tente novamente.');

    return { user: sanitizeUser(user as DbUser), tokens: generateTokens(user as DbUser) };
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
      .eq('is_active', true)
      .maybeSingle();

    if (!user) throw new Error('E-mail ou senha incorretos.');

    const valid = await bcrypt.compare(input.password, (user as DbUser).password_hash);
    if (!valid) throw new Error('E-mail ou senha incorretos.');

    return {
      user: sanitizeUser(user as DbUser),
      tokens: generateTokens(user as DbUser),
    };
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
