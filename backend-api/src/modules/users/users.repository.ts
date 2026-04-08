import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';
import { DbUser } from '../../types';

export const usersRepository = {
  async findById(id: string): Promise<DbUser | null> {
    if (!hasSupabase) return null;

    const { data } = await supabase
      .from('users')
      .select('id, name, email, phone, avatar_url, is_active, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    return (data as DbUser | null);
  },

  async update(
    id: string,
    updates: Partial<Pick<DbUser, 'name' | 'phone' | 'avatar_url'>>
  ): Promise<DbUser | null> {
    if (!hasSupabase) return null;

    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, email, phone, avatar_url, is_active, created_at, updated_at')
      .single();

    if (error) throw new Error('Erro ao atualizar perfil.');
    return data as DbUser;
  },
};
