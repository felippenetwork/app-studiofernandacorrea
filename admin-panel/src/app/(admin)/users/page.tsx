'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Loader2, X, Shield } from 'lucide-react';
import { adminUsersApi } from '@/lib/api';
import { AdminUser, AdminRole } from '@/types';
import { formatRelative } from '@/lib/formatters';
import { getErrorMessage } from '@/lib/utils';
import { useAdminAuthStore } from '@/store/adminAuthStore';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  role: z.enum(['owner', 'gerente', 'recepcao', 'marketing', 'financeiro']),
  isActive: z.boolean().default(true),
});

const roleColor: Record<AdminRole, string> = {
  owner: 'bg-purple-100 text-purple-700',
  gerente: 'bg-blue-100 text-blue-700',
  recepcao: 'bg-green-100 text-green-700',
  marketing: 'bg-pink-100 text-pink-700',
  financeiro: 'bg-amber-100 text-amber-700',
};

const roleDesc: Record<AdminRole, string> = {
  owner: 'Acesso total',
  gerente: 'Acesso a tudo exceto usuários admin',
  recepcao: 'Agenda, clientes e agendamentos',
  marketing: 'Cupons, benefícios, push e aniversários',
  financeiro: 'Pagamentos e relatórios',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const currentUser = useAdminAuthStore((s) => s.user);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<(AdminUser & { lastLoginAt?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<(AdminUser & { lastLoginAt?: string })[]>({
    queryKey: ['admin-users'],
    queryFn: adminUsersApi.list,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: adminUsersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); closeForm(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminUsersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); closeForm(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  function openCreate() { setEditing(null); reset({ name: '', email: '', password: '', role: 'recepcao', isActive: true }); setShowForm(true); setError(null); }
  function openEdit(u: AdminUser) { setEditing(u as any); reset({ name: u.name, email: u.email, role: u.role, isActive: u.isActive }); setShowForm(true); setError(null); }
  function closeForm() { setShowForm(false); setEditing(null); }

  const onSubmit = (data: any) => {
    setError(null);
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  if (currentUser?.role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Shield className="w-10 h-10 text-gray-200 mb-3" />
        <p className="font-medium text-gray-700">Acesso restrito</p>
        <p className="text-sm text-gray-400">Apenas owners podem gerenciar usuários admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Usuários Admin ({users.length})</h2>
          <p className="text-sm text-gray-500">Gerencie a equipe com acesso ao painel.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Novo usuário
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-xl border animate-pulse" />)
        ) : users.map((u) => (
          <div key={u.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C9A4A0]/20 flex items-center justify-center font-bold text-[#C9A4A0]">{u.name.charAt(0)}</div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
              </div>
              <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColor[u.role]}`}>{u.role}</span>
              {!u.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inativo</span>}
            </div>
            <p className="text-xs text-gray-400 mt-2">{roleDesc[u.role]}</p>
            {(u as any).lastLoginAt && <p className="text-xs text-gray-400 mt-1">Último acesso: {formatRelative((u as any).lastLoginAt)}</p>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar usuário' : 'Novo usuário admin'}</h3>
              <button onClick={closeForm} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input {...register('name')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input {...register('email')} type="email" disabled={!!editing} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] disabled:bg-gray-50" />
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha (mín. 8 chars)</label>
                  <input {...register('password')} type="password" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de acesso</label>
                <select {...register('role')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]">
                  {(['owner','gerente','recepcao','marketing','financeiro'] as AdminRole[]).map((r) => (
                    <option key={r} value={r}>{r} — {roleDesc[r]}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input {...register('isActive')} type="checkbox" id="isActiveUser" className="w-4 h-4 accent-[#C9A4A0]" />
                <label htmlFor="isActiveUser" className="text-sm text-gray-700">Usuário ativo</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 h-10 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Salvando…' : (editing ? 'Salvar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
