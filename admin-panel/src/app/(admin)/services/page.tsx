'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Pencil, Trash2, Loader2, Search, X, ChevronDown, ChevronUp, Layers, GripVertical } from 'lucide-react';
import { servicesApi } from '@/lib/api';
import { Service, ServiceVariation } from '@/types';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { getErrorMessage, cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative('Preço inválido'),
  durationMinutes: z.coerce.number().int().positive('Duração obrigatória'),
  category: z.string().min(1, 'Categoria obrigatória'),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});
type ServiceForm = z.infer<typeof schema>;

const CATEGORIES = ['cabelo', 'unhas', 'pele', 'maquiagem', 'sobrancelha', 'cílios', 'outros'];

// ─── Variation Editor ─────────────────────────────────────────────────────────

function VariationEditor({
  variations,
  onChange,
}: {
  variations: ServiceVariation[];
  onChange: (v: ServiceVariation[]) => void;
}) {
  function add() {
    onChange([...variations, { id: `var-${Date.now()}`, name: '', price: 0 }]);
  }
  function remove(id: string) {
    onChange(variations.filter((v) => v.id !== id));
  }
  function update(id: string, field: keyof ServiceVariation, value: any) {
    onChange(variations.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">Variações</label>
          <p className="text-xs text-gray-400 mt-0.5">
            {variations.length === 0
              ? 'Sem variações — todos pagam o preço base.'
              : `${variations.length} variação(ões) — o cliente escolhe ao agendar.`}
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs text-[#C9A4A0] hover:text-[#b8918d] font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar variação
        </button>
      </div>

      {variations.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_100px_72px_28px] gap-2 px-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nome</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Preço (R$)</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Min.</span>
            <span />
          </div>
          {variations.map((v) => (
            <div key={v.id} className="grid grid-cols-[1fr_100px_72px_28px] gap-2 items-center bg-gray-50 rounded-lg px-2 py-2">
              <input
                value={v.name}
                onChange={(e) => update(v.id, 'name', e.target.value)}
                placeholder="ex: Colocação"
                className="h-8 px-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#C9A4A0] bg-white"
              />
              <input
                type="number" step="0.01" min="0"
                value={v.price}
                onChange={(e) => update(v.id, 'price', Number(e.target.value))}
                className="h-8 px-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#C9A4A0] bg-white"
              />
              <input
                type="number" min="1"
                value={v.durationMinutes ?? ''}
                onChange={(e) => update(v.id, 'durationMinutes', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="—"
                className="h-8 px-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#C9A4A0] bg-white"
              />
              <button
                type="button" onClick={() => remove(v.id)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Price display ────────────────────────────────────────────────────────────

function PriceCell({ service }: { service: Service }) {
  if (!service.variations?.length) return <span>{formatCurrency(service.price)}</span>;
  const prices = service.variations.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return <span>{formatCurrency(min)}</span>;
  return (
    <span className="text-gray-700">
      {formatCurrency(min)}<span className="text-gray-400"> – </span>{formatCurrency(max)}
    </span>
  );
}

// ─── Expandable variations badge ──────────────────────────────────────────────

function VariationsBadge({ service }: { service: Service }) {
  const [open, setOpen] = useState(false);
  const count = service.variations?.length ?? 0;
  if (count === 0) return null;
  return (
    <div className="mt-0.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] text-[#C9A4A0] hover:text-[#b8918d] font-medium"
      >
        <Layers className="w-3 h-3" />
        {count} variação(ões)
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-1.5 ml-1 space-y-0.5">
          {service.variations.map((v) => (
            <div key={v.id} className="flex items-center gap-2 text-[11px] text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A4A0] flex-shrink-0" />
              <span className="font-medium">{v.name}</span>
              <span className="text-gray-400">·</span>
              <span>{formatCurrency(v.price)}</span>
              {v.durationMinutes && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-400">{v.durationMinutes} min</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableRow({
  service,
  onEdit,
  onDelete,
  isDragging,
}: {
  service: Service;
  onEdit: (s: Service) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn('hover:bg-gray-50/50', isDragging && 'bg-white shadow-lg')}
    >
      {/* Drag handle */}
      <td className="pl-3 pr-1 py-3.5 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors touch-none"
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-4 py-3.5">
        <p className="font-medium text-gray-900">{service.name}</p>
        <VariationsBadge service={service} />
      </td>
      <td className="px-4 py-3.5 text-gray-600 capitalize">{service.category}</td>
      <td className="px-4 py-3.5 text-gray-900"><PriceCell service={service} /></td>
      <td className="px-4 py-3.5 text-gray-600">{formatDuration(service.durationMinutes)}</td>
      <td className="px-4 py-3.5">
        <span className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          service.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        )}>
          {service.isActive ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => onEdit(service)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(service.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Service | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variations, setVariations] = useState<ServiceVariation[]>([]);
  const [feeType, setFeeType] = useState<'fixed' | 'percentage'>('fixed');
  const [feeValue, setFeeValue] = useState<number>(40);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['admin-services'],
    queryFn: servicesApi.list,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ServiceForm>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => servicesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); closeForm(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => servicesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); closeForm(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: servicesApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-services'] }); setDeleteId(null); },
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => servicesApi.reorder(items),
  });

  function openCreate() {
    setEditing(null);
    setVariations([]);
    setFeeType('fixed');
    setFeeValue(40);
    reset({ name: '', description: '', price: 0, durationMinutes: 60, category: 'cabelo', isActive: true });
    setShowForm(true);
    setError(null);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setVariations(s.variations ?? []);
    setFeeType(s.bookingFeeType ?? 'fixed');
    setFeeValue(s.bookingFeeValue ?? 40);
    reset({
      name: s.name, description: s.description ?? '',
      price: s.price, durationMinutes: s.durationMinutes,
      category: s.category, imageUrl: s.imageUrl ?? '',
      isActive: s.isActive,
    });
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setVariations([]);
    setFeeType('fixed');
    setFeeValue(40);
  }

  const onSubmit = (data: ServiceForm) => {
    setError(null);
    const payload = { ...data, variations, bookingFeeType: feeType, bookingFeeValue: feeValue };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────

  // When searching, disable reorder (list is filtered)
  const isFiltering = search.trim().length > 0;

  // Local ordered list (used as source of truth while not filtering)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const orderedServices = (() => {
    if (isFiltering) {
      return services.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (localOrder) {
      const map = new Map(services.map((s) => [s.id, s]));
      return localOrder.map((id) => map.get(id)).filter(Boolean) as Service[];
    }
    return [...services].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  })();

  function handleDragStart(event: any) {
    setDraggingId(String(event.active.id));
    // Snapshot current order if not yet set
    if (!localOrder) {
      setLocalOrder(orderedServices.map((s) => s.id));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = localOrder ?? orderedServices.map((s) => s.id);
    const oldIndex = current.indexOf(String(active.id));
    const newIndex = current.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(current, oldIndex, newIndex);
    setLocalOrder(reordered);

    // Persist to backend
    const items = reordered.map((id, i) => ({ id, sortOrder: i }));
    reorderMutation.mutate(items, {
      onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-services'] }),
    });
  }

  const displayList = orderedServices;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Serviços ({services.length})</h2>
          <p className="text-sm text-gray-500">Arraste para reordenar. A ordem reflete no app.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Novo serviço
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar serviço…"
            className="w-full pl-9 pr-3 h-9 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
          />
        </div>
        {reorderMutation.isPending && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando ordem…
          </span>
        )}
        {isFiltering && (
          <span className="text-xs text-gray-400 italic">Arrastar desabilitado durante a busca</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0] mx-auto" />
          </div>
        ) : displayList.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-sm">Nenhum serviço encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="w-8 pl-3" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Preço</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duração</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayList.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
                disabled={isFiltering}
              >
                <tbody className="divide-y divide-gray-50">
                  {displayList.map((s) => (
                    <SortableRow
                      key={s.id}
                      service={s}
                      onEdit={openEdit}
                      onDelete={setDeleteId}
                      isDragging={draggingId === s.id}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar serviço' : 'Novo serviço'}</h3>
              <button onClick={closeForm} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input {...register('name')} placeholder="ex: Cílios Fio a Fio Clássico" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea {...register('description')} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço base (R$)
                    {variations.length > 0 && <span className="text-gray-400 font-normal"> (padrão)</span>}
                  </label>
                  <input {...register('price')} type="number" step="0.01" min="0" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min) *</label>
                  <input {...register('durationMinutes')} type="number" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                  {errors.durationMinutes && <p className="text-red-500 text-xs mt-1">{errors.durationMinutes.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
                  <select {...register('category')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white">
                    {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL da imagem</label>
                <input {...register('imageUrl')} type="url" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <VariationEditor variations={variations} onChange={setVariations} />
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Taxa de reserva</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFeeType('fixed')}
                    className={cn(
                      'flex-1 h-9 rounded-lg text-sm font-medium border transition-colors',
                      feeType === 'fixed'
                        ? 'bg-[#C9A4A0] text-white border-[#C9A4A0]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#C9A4A0]'
                    )}
                  >
                    Fixo (R$)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeType('percentage')}
                    className={cn(
                      'flex-1 h-9 rounded-lg text-sm font-medium border transition-colors',
                      feeType === 'percentage'
                        ? 'bg-[#C9A4A0] text-white border-[#C9A4A0]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#C9A4A0]'
                    )}
                  >
                    Porcentagem (%)
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-6 text-center">{feeType === 'fixed' ? 'R$' : '%'}</span>
                  <input
                    type="number"
                    step={feeType === 'fixed' ? '0.01' : '1'}
                    min="0"
                    max={feeType === 'percentage' ? '100' : undefined}
                    value={feeValue}
                    onChange={(e) => setFeeValue(Number(e.target.value))}
                    className="w-28 h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
                  />
                  {feeType === 'percentage' && (
                    <span className="text-xs text-gray-400">% do preço do serviço</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input {...register('isActive')} type="checkbox" id="isActive" className="w-4 h-4 accent-[#C9A4A0]" />
                <label htmlFor="isActive" className="text-sm text-gray-700">Serviço ativo</label>
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

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Remover serviço?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm">Cancelar</button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium"
              >
                {deleteMutation.isPending ? 'Removendo…' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
