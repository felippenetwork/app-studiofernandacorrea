'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, X, Star } from 'lucide-react';
import { professionalsApi } from '@/lib/api';
import { Professional } from '@/types';
import { getErrorMessage } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  bio: z.string().optional(),
  avatarUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  specialtiesRaw: z.string().optional(),
  isActive: z.boolean().default(true),
  trinksEmployeeId: z.string().optional(),
});
type ProfForm = z.infer<typeof schema>;

export default function ProfessionalsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Professional | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: professionals = [], isLoading } = useQuery<Professional[]>({
    queryKey: ['admin-professionals'],
    queryFn: professionalsApi.list,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfForm>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (data: any) => professionalsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-professionals'] }); closeForm(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => professionalsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-professionals'] }); closeForm(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: professionalsApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-professionals'] }); setDeleteId(null); },
  });

  function openCreate() {
    setEditing(null);
    reset({ name: '', bio: '', avatarUrl: '', specialtiesRaw: '', isActive: true });
    setShowForm(true); setError(null);
  }

  function openEdit(p: Professional) {
    setEditing(p);
    reset({ name: p.name, bio: p.bio ?? '', avatarUrl: p.avatarUrl ?? '', specialtiesRaw: p.specialties.join(', '), isActive: p.isActive, trinksEmployeeId: p.trinksEmployeeId });
    setShowForm(true); setError(null);
  }

  function closeForm() { setShowForm(false); setEditing(null); }

  const onSubmit = (data: ProfForm) => {
    setError(null);
    const { specialtiesRaw, avatarUrl, trinksEmployeeId, ...rest } = data;
    const payload = {
      ...rest,
      specialties: (specialtiesRaw ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(trinksEmployeeId ? { trinksEmployeeId } : {}),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Profissionais ({professionals.length})</h2>
          <p className="text-sm text-gray-500">Gerencie a equipe do studio.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nova profissional
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-xl border border-gray-100 animate-pulse" />)
        ) : professionals.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#C9A4A0]/20 flex items-center justify-center text-lg font-bold text-[#C9A4A0]">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-xs text-gray-500">{p.rating.toFixed(1)} ({p.reviewCount})</span>
                  </div>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.isActive ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            {p.bio && <p className="text-xs text-gray-500 mt-3 line-clamp-2">{p.bio}</p>}
            {p.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {p.specialties.map((s) => (
                  <span key={s} className="text-xs bg-[#C9A4A0]/10 text-[#C9A4A0] px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => openEdit(p)} className="flex-1 h-8 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
                <Pencil className="w-3 h-3" /> Editar
              </button>
              <button onClick={() => setDeleteId(p.id)} className="h-8 px-3 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar profissional' : 'Nova profissional'}</h3>
              <button onClick={closeForm} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input {...register('name')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea {...register('bio')} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidades (separar por vírgula)</label>
                <input {...register('specialtiesRaw')} placeholder="Coloração, Mechas, Progressiva" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do avatar</label>
                <input {...register('avatarUrl')} type="url" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Trinks (opcional)</label>
                <input {...register('trinksEmployeeId')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>
              <div className="flex items-center gap-2">
                <input {...register('isActive')} type="checkbox" id="isActivePro" className="w-4 h-4 accent-[#C9A4A0]" />
                <label htmlFor="isActivePro" className="text-sm text-gray-700">Profissional ativa</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 h-10 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Salvando…' : (editing ? 'Salvar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Remover profissional?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} className="flex-1 h-10 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium">
                {deleteMutation.isPending ? 'Removendo…' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
