'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, X, Gift, ToggleLeft, ToggleRight } from 'lucide-react';
import { benefitsApi } from '@/lib/api';
import { Benefit } from '@/types';
import { getErrorMessage } from '@/lib/utils';

const schema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  type: z.enum(['promocao', 'evento', 'novidade', 'exclusivo']),
  imageUrl: z.string().url().optional().or(z.literal('')),
  cta: z.string().optional(),
  ctaLink: z.string().url().optional().or(z.literal('')),
  validUntil: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const typeColor: Record<string, string> = {
  promocao: 'bg-pink-100 text-pink-700',
  evento: 'bg-blue-100 text-blue-700',
  novidade: 'bg-purple-100 text-purple-700',
  exclusivo: 'bg-amber-100 text-amber-700',
};

const typeLabel: Record<string, string> = {
  promocao: 'Promoção',
  evento: 'Evento',
  novidade: 'Novidade',
  exclusivo: 'Exclusivo',
};

export default function BenefitsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Benefit | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: benefits = [], isLoading } = useQuery<Benefit[]>({
    queryKey: ['benefits'],
    queryFn: benefitsApi.list,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: benefitsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['benefits'] }); closeForm(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => benefitsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['benefits'] }); closeForm(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: benefitsApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['benefits'] }); setDeleting(null); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  function openCreate() {
    setEditing(null);
    reset({ title: '', description: '', type: 'promocao', imageUrl: '', cta: '', ctaLink: '', isActive: true, sortOrder: 0 });
    setShowForm(true);
    setError(null);
  }

  function openEdit(b: Benefit) {
    setEditing(b);
    reset({ ...b, imageUrl: b.imageUrl ?? '', cta: b.cta ?? '', ctaLink: b.ctaLink ?? '', validUntil: b.validUntil ?? '' });
    setShowForm(true);
    setError(null);
  }

  function closeForm() { setShowForm(false); setEditing(null); }

  const onSubmit = (data: any) => {
    setError(null);
    const payload = { ...data, imageUrl: data.imageUrl || undefined, ctaLink: data.ctaLink || undefined };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Benefícios & Campanhas ({benefits.length})</h2>
          <p className="text-sm text-gray-500">Cards exibidos no app para clientes — promoções, eventos e novidades.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Novo benefício
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-xl border animate-pulse" />)}
        </div>
      ) : benefits.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Gift className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum benefício cadastrado.</p>
          <p className="text-xs text-gray-400 mt-1">Crie promoções e campanhas para exibir no app.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {benefits.map((b) => (
            <div key={b.id} className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-3 ${b.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
              {b.imageUrl && (
                <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[b.type]}`}>{typeLabel[b.type]}</span>
                    {!b.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inativo</span>}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm truncate">{b.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{b.description}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleting(b.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {b.cta && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#C9A4A0] font-medium">{b.cta}</span>
                  {b.validUntil && <span className="text-xs text-gray-400">· válido até {new Date(b.validUntil).toLocaleDateString('pt-BR')}</span>}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-gray-400">
                {b.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                <span>{b.isActive ? 'Visível no app' : 'Oculto'}</span>
                <span className="ml-auto">Ordem: {b.sortOrder}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Excluir benefício?</h3>
            <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => deleteMutation.mutate(deleting)}
                disabled={deleteMutation.isPending}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar benefício' : 'Novo benefício'}</h3>
              <button onClick={closeForm} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input {...register('title')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message as string}</p>}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                  <textarea {...register('description')} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select {...register('type')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]">
                    <option value="promocao">Promoção</option>
                    <option value="evento">Evento</option>
                    <option value="novidade">Novidade</option>
                    <option value="exclusivo">Exclusivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordem de exibição</label>
                  <input {...register('sortOrder', { valueAsNumber: true })} type="number" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL da imagem</label>
                  <input {...register('imageUrl')} type="url" placeholder="https://…" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto do botão (CTA)</label>
                  <input {...register('cta')} placeholder="Saiba mais" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Válido até</label>
                  <input {...register('validUntil')} type="date" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link do CTA</label>
                  <input {...register('ctaLink')} type="url" placeholder="https://…" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <input {...register('isActive')} type="checkbox" id="benefitActive" className="w-4 h-4 accent-[#C9A4A0]" />
                  <label htmlFor="benefitActive" className="text-sm text-gray-700">Visível no app</label>
                </div>
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
