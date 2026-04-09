'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, X, Tag } from 'lucide-react';
import { couponsApi } from '@/lib/api';
import { Coupon } from '@/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getErrorMessage } from '@/lib/utils';

const schema = z.object({
  code: z.string().min(3, 'Código obrigatório').toUpperCase(),
  title: z.string().min(2, 'Título obrigatório'),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().positive('Valor obrigatório'),
  maxUsages: z.coerce.number().int().positive().optional().or(z.literal('')),
  validFrom: z.string().min(1, 'Data obrigatória'),
  validUntil: z.string().min(1, 'Data obrigatória'),
  status: z.enum(['ativo', 'expirado', 'esgotado']).default('ativo'),
  rulesRaw: z.string().optional(),
});
type CouponForm = z.infer<typeof schema>;

const statusBadge: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  expirado: 'bg-gray-100 text-gray-500',
  esgotado: 'bg-red-100 text-red-600',
};

export default function CouponsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ['admin-coupons'],
    queryFn: couponsApi.list,
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<CouponForm>({ resolver: zodResolver(schema) });
  const discountType = watch('discountType', 'fixed');

  const createMutation = useMutation({
    mutationFn: (data: any) => couponsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); closeForm(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => couponsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); closeForm(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: couponsApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); setDeleteId(null); },
  });

  function openCreate() {
    setEditing(null);
    reset({ code: '', title: '', discountType: 'fixed', discountValue: 0, validFrom: new Date().toISOString().slice(0, 10), validUntil: '', status: 'ativo' });
    setShowForm(true); setError(null);
  }

  function openEdit(c: Coupon) {
    setEditing(c);
    reset({ code: c.code, title: c.title, description: c.description, discountType: c.discountType, discountValue: c.discountValue, maxUsages: c.maxUsages, validFrom: c.validFrom, validUntil: c.validUntil, status: c.status, rulesRaw: c.rules?.join('\n') });
    setShowForm(true); setError(null);
  }

  function closeForm() { setShowForm(false); setEditing(null); }

  const onSubmit = (data: CouponForm) => {
    setError(null);
    const payload = { ...data, rules: (data.rulesRaw ?? '').split('\n').map((r) => r.trim()).filter(Boolean), maxUsages: data.maxUsages || undefined };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cupons ({coupons.length})</h2>
          <p className="text-sm text-gray-500">Crie e gerencie cupons de desconto.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Novo cupom
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0] mx-auto" /></div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center"><Tag className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">Nenhum cupom.</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Desconto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Validade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usos</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{c.code}</code></td>
                  <td className="px-4 py-3.5 font-medium text-gray-900">{c.title}</td>
                  <td className="px-4 py-3.5 text-gray-800">{c.discountType === 'percentage' ? `${c.discountValue}%` : formatCurrency(c.discountValue)}</td>
                  <td className="px-4 py-3.5 text-gray-600 text-xs">{formatDate(c.validFrom)} — {formatDate(c.validUntil)}</td>
                  <td className="px-4 py-3.5 text-gray-600">{c.usedCount}{c.maxUsages ? `/${c.maxUsages}` : ''}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar cupom' : 'Novo cupom'}</h3>
              <button onClick={closeForm} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input {...register('code')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                  {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select {...register('status')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]">
                    <option value="ativo">Ativo</option>
                    <option value="expirado">Expirado</option>
                    <option value="esgotado">Esgotado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input {...register('title')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de desconto</label>
                  <select {...register('discountType')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]">
                    <option value="fixed">Valor fixo (R$)</option>
                    <option value="percentage">Percentual (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                  <input {...register('discountValue')} type="number" step="0.01" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                  {errors.discountValue && <p className="text-red-500 text-xs mt-1">{errors.discountValue.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Válido de *</label>
                  <input {...register('validFrom')} type="date" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Válido até *</label>
                  <input {...register('validUntil')} type="date" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de usos</label>
                <input {...register('maxUsages')} type="number" placeholder="Ilimitado" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regras (uma por linha)</label>
                <textarea {...register('rulesRaw')} rows={3} placeholder="Válido para um agendamento&#10;Intransferível" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none" />
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

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Remover cupom?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} className="flex-1 h-10 bg-red-500 text-white rounded-lg text-sm font-medium">
                {deleteMutation.isPending ? 'Removendo…' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
