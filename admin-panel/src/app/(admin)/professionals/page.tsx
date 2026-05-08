'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, X, Star, ChevronDown, Check, Tag } from 'lucide-react';
import { professionalsApi, servicesApi, professionalSpecialtiesApi } from '@/lib/api';
import { Professional, Service } from '@/types';
import { getErrorMessage, cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  bio: z.string().optional(),
  avatarUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  specialties: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  trinksEmployeeId: z.string().optional(),
});
type ProfForm = z.infer<typeof schema>;

// ─── Specialties multi-select ─────────────────────────────────────────────────

function SpecialtiesSelect({
  value,
  onChange,
  services,
  customSpecialties,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  services: Service[];
  customSpecialties: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const activeServices = services.filter((s) => s.isActive);
  const q = search.toLowerCase();
  const filteredServices = activeServices.filter((s) => s.name.toLowerCase().includes(q));
  const filteredCustom = customSpecialties.filter((s) => s.toLowerCase().includes(q));
  const hasResults = filteredServices.length > 0 || filteredCustom.length > 0;

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  }

  function remove(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((v) => v !== name));
  }

  function OptionRow({ name }: { name: string }) {
    const selected = value.includes(name);
    return (
      <button
        type="button"
        onClick={() => toggle(name)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors',
          selected ? 'bg-[#C9A4A0]/10 text-[#9b6f6b]' : 'hover:bg-gray-50 text-gray-700'
        )}
      >
        <span className={cn(
          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
          selected ? 'bg-[#C9A4A0] border-[#C9A4A0]' : 'border-gray-300'
        )}>
          {selected && <Check className="w-3 h-3 text-white" />}
        </span>
        {name}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'min-h-10 w-full px-3 py-2 border rounded-lg text-sm cursor-pointer flex flex-wrap gap-1.5 items-center transition-colors',
          open ? 'border-[#C9A4A0] ring-2 ring-[#C9A4A0]/20' : 'border-gray-200 hover:border-gray-300'
        )}
      >
        {value.length === 0 ? (
          <span className="text-gray-400 select-none">Selecione especialidades…</span>
        ) : (
          value.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 bg-[#C9A4A0]/15 text-[#9b6f6b] text-xs font-medium px-2 py-0.5 rounded-full">
              {name}
              <button type="button" onClick={(e) => remove(name, e)} className="rounded-full hover:bg-[#C9A4A0]/30 p-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))
        )}
        <ChevronDown className={cn('w-4 h-4 text-gray-400 ml-auto flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full h-8 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C9A4A0]"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {!hasResults && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum resultado</p>
            )}
            {filteredServices.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Serviços</p>
                {filteredServices.map((s) => <OptionRow key={s.id} name={s.name} />)}
              </>
            )}
            {filteredCustom.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Especialidades</p>
                {filteredCustom.map((s) => <OptionRow key={s} name={s} />)}
              </>
            )}
          </div>
          {value.length > 0 && (
            <div className="p-2 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-400">{value.length} selecionado{value.length > 1 ? 's' : ''}</span>
              <button type="button" onClick={() => onChange([])} className="text-xs text-red-400 hover:text-red-600">Limpar tudo</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Specialty Manager modal ──────────────────────────────────────────────────

function SpecialtyManager({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: specialties = [] } = useQuery<string[]>({
    queryKey: ['admin-professional-specialties'],
    queryFn: professionalSpecialtiesApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: (list: string[]) => professionalSpecialtiesApi.save(list),
    onSuccess: (data) => { qc.setQueryData(['admin-professional-specialties'], data); setError(null); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  function add() {
    const label = newLabel.trim();
    if (!label) return;
    if (specialties.includes(label)) { setError('Especialidade já existe.'); return; }
    saveMutation.mutate([...specialties, label]);
    setNewLabel('');
  }

  function remove(label: string) {
    saveMutation.mutate(specialties.filter((s) => s !== label));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Gerenciar Especialidades</h3>
            <p className="text-xs text-gray-400 mt-0.5">Aparecem só no perfil da profissional, não no menu do app.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Add new */}
          <div className="flex gap-2">
            <input
              value={newLabel}
              onChange={(e) => { setNewLabel(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              placeholder="Nova especialidade… ex: Técnica Balayage"
              className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
            />
            <button
              type="button"
              onClick={add}
              disabled={!newLabel.trim() || saveMutation.isPending}
              className="h-10 px-4 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </button>
          </div>

          {/* List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {specialties.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma especialidade cadastrada ainda.</p>
            ) : (
              specialties.map((s) => (
                <div key={s} className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-[#C9A4A0] flex-shrink-0" />
                    <span className="text-sm text-gray-700">{s}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(s)}
                    disabled={saveMutation.isPending}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full h-10 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfessionalsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Professional | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSpecialtyManager, setShowSpecialtyManager] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: professionals = [], isLoading } = useQuery<Professional[]>({
    queryKey: ['admin-professionals'],
    queryFn: professionalsApi.list,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['admin-services'],
    queryFn: servicesApi.list,
  });

  const { data: customSpecialties = [] } = useQuery<string[]>({
    queryKey: ['admin-professional-specialties'],
    queryFn: professionalSpecialtiesApi.list,
  });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } =
    useForm<ProfForm>({ resolver: zodResolver(schema) });

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
    reset({ name: '', bio: '', avatarUrl: '', specialties: [], isActive: true, trinksEmployeeId: '' });
    setShowForm(true); setError(null);
  }

  function openEdit(p: Professional) {
    setEditing(p);
    reset({
      name: p.name,
      bio: p.bio ?? '',
      avatarUrl: p.avatarUrl ?? '',
      specialties: p.specialties ?? [],
      isActive: p.isActive,
      trinksEmployeeId: p.trinksEmployeeId ?? '',
    });
    setShowForm(true); setError(null);
  }

  function closeForm() { setShowForm(false); setEditing(null); }

  const onSubmit = (data: ProfForm) => {
    setError(null);
    const { avatarUrl, trinksEmployeeId, ...rest } = data;
    const payload = {
      ...rest,
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSpecialtyManager(true)}
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Tag className="w-4 h-4" /> Especialidades
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova profissional
          </button>
        </div>
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

      {/* Specialty Manager Modal */}
      {showSpecialtyManager && <SpecialtyManager onClose={() => setShowSpecialtyManager(false)} />}

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
                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidades</label>
                <Controller
                  name="specialties"
                  control={control}
                  render={({ field }) => (
                    <SpecialtiesSelect
                      value={field.value}
                      onChange={field.onChange}
                      services={services}
                      customSpecialties={customSpecialties}
                    />
                  )}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Serviços do menu + especialidades cadastradas.{' '}
                  <button type="button" onClick={() => setShowSpecialtyManager(true)} className="text-[#C9A4A0] hover:underline">
                    Gerenciar especialidades
                  </button>
                </p>
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
