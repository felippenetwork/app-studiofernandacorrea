import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env, hasSupabase, adminJwtSecret } from '../../config/env';
import { supabase } from '../../config/supabase';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'gerente' | 'recepcao' | 'marketing' | 'financeiro';
  isActive: boolean;
}

// Dev-only fallback (only used when Supabase is not configured)
const DEV_ADMIN = {
  id: 'admin-dev-1',
  name: 'Admin Dev',
  email: 'admin@dev.local',
  password_hash: bcrypt.hashSync('dev-password-change-me', 10),
  role: 'owner' as const,
  is_active: true,
};

export const adminAuthService = {
  async login(email: string, password: string): Promise<{ token: string; admin: AdminUser }> {
    let admin: { id: string; name: string; email: string; password_hash: string; role: string; is_active: boolean } | null = null;

    if (!hasSupabase) {
      if (email.toLowerCase() === DEV_ADMIN.email) {
        admin = DEV_ADMIN;
      }
    } else {
      const { data } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .maybeSingle();
      admin = data;
    }

    if (!admin) throw new Error('Credenciais inválidas.');

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) throw new Error('Credenciais inválidas.');

    const token = jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role, type: 'admin' },
      adminJwtSecret,
      { expiresIn: '8h' }
    );

    if (hasSupabase) {
      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', admin.id);
    }

    return {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role as AdminUser['role'],
        isActive: admin.is_active,
      },
    };
  },

  verifyToken(token: string): { sub: string; email: string; role: string } {
    return jwt.verify(token, adminJwtSecret) as { sub: string; email: string; role: string; type: string };
  },

  async createAdmin(data: { name: string; email: string; password: string; role: string }): Promise<AdminUser> {
    const password_hash = await bcrypt.hash(data.password, 12);

    if (!hasSupabase) {
      return {
        id: `admin-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: data.role as AdminUser['role'],
        isActive: true,
      };
    }

    const { data: created, error } = await supabase
      .from('admin_users')
      .insert({ name: data.name, email: data.email.toLowerCase(), password_hash, role: data.role, is_active: true })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: (created as any).id,
      name: (created as any).name,
      email: (created as any).email,
      role: (created as any).role,
      isActive: (created as any).is_active,
    };
  },
};
