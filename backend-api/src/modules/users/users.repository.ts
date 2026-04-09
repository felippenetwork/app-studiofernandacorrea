import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';
import { DbUser } from '../../types';

const USER_FIELDS = 'id, name, email, phone, avatar_url, birth_date, accepts_marketing, accepts_push, is_vip, is_blocked, is_active, created_at, updated_at';

export const usersRepository = {
  async findById(id: string): Promise<Omit<DbUser, 'password_hash' | 'internal_notes'> | null> {
    if (!hasSupabase) return null;

    const { data } = await supabase
      .from('users')
      .select(USER_FIELDS)
      .eq('id', id)
      .maybeSingle();

    return (data as DbUser | null);
  },

  async update(
    id: string,
    updates: Partial<Pick<DbUser, 'name' | 'phone' | 'avatar_url' | 'birth_date' | 'accepts_marketing' | 'accepts_push'>>
  ): Promise<Omit<DbUser, 'password_hash' | 'internal_notes'> | null> {
    if (!hasSupabase) return null;

    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(USER_FIELDS)
      .single();

    if (error) throw new Error('Erro ao atualizar perfil.');
    return data as DbUser;
  },
};
