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
import { Plus, Pencil, Trash2, Loader2, Search, X, ChevronDown, ChevronUp, Layers, GripVertical, Tag, Check } from 'lucide-react';
import { servicesApi, serviceCategoriesApi } from '@/lib/api';
import { Service, ServiceVariation } from '@/types';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { getErrorMessage, cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative('Preço inválido'),
  durationMinutes: z.coerce.number().int().positive('Duração obrigatória'),
  categories: z.array(z.string()).min(1, 'Selecione ao menos uma categoria'),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});
type ServiceForm = z.infer<typeof schema>;

// ─── Category Manager ─────────────────────────────────────────────────────────

// ─── Sortable category row ────────────────────────────────────────────────────

function SortableCategoryRow({
  cat,
  editingKey,
  editLabel,
  onEditStart,
  onEditChange,
  onEditConfirm,
  onEditCancel,
  onRemove,
  isPending,
}: {
  cat: { key: string; label: string };
  editingKey: string | null;
  editLabel: string;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  onRemove: () => void;
  isPending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100', isDragging && 'shadow-lg bg-white')}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded text-gray-300 hover:text-gray-500 touch-none flex-shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {editingKey === cat.key ? (
        <>
          <input
            value={editLabel}
            onChange={(e) => onEditChange(e.target.value)}
            className="flex-1 h-8 px-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#C9A4A0]"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') onEditConfirm(); if (e.key === 'Escape') onEditCancel(); }}
          />
          <button onClick={onEditConfirm} disabled={isPending || !editLabel.trim()} className="p-1.5 rounded hover:bg-green-50 text-green-600 disabled:opacity-40">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onEditCancel} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800">{cat.label}</p>
          </div>
          <button onClick={onEditStart} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRemove} disabled={isPending} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-40">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Category Manager modal ───────────────────────────────────────────────────

function CategoryManager({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<{ key: string; label: string }[] | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: categories = [] } = useQuery<{ key: string; label: string }[]>({
    queryKey: ['admin-service-categories'],
    queryFn: serviceCategoriesApi.list,
  });

  // Keep localOrder in sync when server data arrives (but don't override user drags)
  const displayList = localOrder ?? categories;

  const upsertMutation = useMutation({
    mutationFn: (cats: { key: string; label: string }[]) =>
      serviceCategoriesApi.reorder(cats),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-service-categories'] }),
  });

  const editMutation = useMutation({
    mutationFn: (cat: { key: string; label: string }) => serviceCategoriesApi.upsert(cat),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-categories'] }); setLocalOrder(null); setEditingKey(null); setError(null); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const addMutation = useMutation({
    mutationFn: (cat: { key: string; label: string }) => serviceCategoriesApi.upsert(cat),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-service-categories'] }); setLocalOrder(null); setNewKey(''); setNewLabel(''); setError(null); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const removeMutation = useMutation({
    mutationFn: (key: string) => serviceCategoriesApi.remove(key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-service-categories'] });
      setLocalOrder(null);
      setConfirmDeleteKey(null);
      setDeleteError(null);
    },
    onError: (e) => {
      setDeleteError(getErrorMessage(e));
    },
  });

  function slugify(str: string) {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const base = localOrder ?? categories;
    const oldIdx = base.findIndex((c) => c.key === active.id);
    const newIdx = base.findIndex((c) => c.key === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(base, oldIdx, newIdx);
    setLocalOrder(reordered);
    upsertMutation.mutate(reordered);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#C9A4A0]" />
            <h3 className="font-semibold text-gray-900">Gerenciar Categorias</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Sortable list */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayList.map((c) => c.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {displayList.map((cat) => (
                  <SortableCategoryRow
                    key={cat.key}
                    cat={cat}
                    editingKey={editingKey}
                    editLabel={editLabel}
                    onEditStart={() => { setEditingKey(cat.key); setEditLabel(cat.label); }}
                    onEditChange={setEditLabel}
                    onEditConfirm={() => editMutation.mutate({ key: cat.key, label: editLabel })}
                    onEditCancel={() => setEditingKey(null)}
                    onRemove={() => { setConfirmDeleteKey(cat.key); setDeleteError(null); }}
                    isPending={editMutation.isPending || removeMutation.isPending}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add new */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Nova categoria</p>
            <div className="space-y-2">
              <input
                value={newLabel}
                onChange={(e) => { setNewLabel(e.target.value); setNewKey(slugify(e.target.value)); }}
                placeholder="Nome da categoria  ex: Massagem"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
                onKeyDown={(e) => { if (e.key === 'Enter' && newLabel.trim() && newKey) addMutation.mutate({ key: newKey, label: newLabel.trim() }); }}
              />
              {newLabel && (
                <p className="text-xs text-gray-400">Chave: <span className="font-mono text-gray-600">{newKey}</span></p>
              )}
            </div>
            <button
              onClick={() => addMutation.mutate({ key: newKey, label: newLabel.trim() })}
              disabled={addMutation.isPending || !newLabel.trim() || !newKey}
              className="w-full h-9 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Confirm delete dialog */}
      {confirmDeleteKey && (() => {
        const catLabel = displayList.find(c => c.key === confirmDeleteKey)?.label ?? confirmDeleteKey;
        const keyToDelete = confirmDeleteKey; // capture for safe closure
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              {deleteError ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                    <Tag className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 mb-2">Não foi possível excluir</h4>
                    <p className="text-sm text-gray-600">{deleteError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setConfirmDeleteKey(null); setDeleteError(null); }}
                    className="w-full h-10 bg-[#C9A4A0] hover:bg-[#b8918d] text-white rounded-lg text-sm font-medium"
                  >
                    Entendi
                  </button>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 mb-2">Excluir categoria?</h4>
                    <p className="text-sm text-gray-600">
                      A categoria <strong>"{catLabel}"</strong> será removida permanentemente.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setConfirmDeleteKey(null); setDeleteError(null); }}
                      disabled={removeMutation.isPending}
                      className="flex-1 h-10 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(keyToDelete)}
                      disabled={removeMutation.isPending}
                      className="flex-1 h-10 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {removeMutation.isPending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo…</>
                        : 'Sim, excluir'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

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
  categoryList,
}: {
  service: Service;
  onEdit: (s: Service) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
  categoryList: { key: string; label: string }[];
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
      <td className="px-4 py-3.5 text-gray-600">
        <div className="flex flex-wrap gap-1">
          {(service.categories?.length ? service.categories : [service.category]).map((c) => {
            const label = categoryList.find((cat) => cat.key === c)?.label ?? c;
            return <span key={c} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{label}</span>;
          })}
        </div>
      </td>
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
  const [showCategories, setShowCategories] = useState(false);

  const { data: categories = [] } = useQuery<{ key: string; label: string }[]>({
    queryKey: ['admin-service-categories'],
    queryFn: serviceCategoriesApi.list,
  });

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
    onSuccess: () => {
      setLocalOrder(null);
      qc.invalidateQueries({ queryKey: ['admin-services'] });
      closeForm();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => servicesApi.update(id, data),
    onSuccess: () => {
      setLocalOrder(null);
      qc.invalidateQueries({ queryKey: ['admin-services'] });
      closeForm();
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: servicesApi.remove,
    onSuccess: () => {
      setLocalOrder(null);
      qc.invalidateQueries({ queryKey: ['admin-services'] });
      setDeleteId(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => servicesApi.reorder(items),
  });

  function openCreate() {
    setEditing(null);
    setVariations([]);
    setFeeType('fixed');
    setFeeValue(40);
    reset({ name: '', description: '', price: 0, durationMinutes: 60, categories: [], isActive: true });
    setShowForm(true);
    setError(null);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setVariations(s.variations ?? []);
    setFeeType(s.bookingFeeType ?? 'fixed');
    setFeeValue(s.bookingFeeValue ?? 40);
    const cats = s.categories?.length ? s.categories : (s.category ? [s.category] : []);
    reset({
      name: s.name, description: s.description ?? '',
      price: s.price, durationMinutes: s.durationMinutes,
      categories: cats, imageUrl: s.imageUrl ?? '',
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
    const payload = {
      ...data,
      category: data.categories[0],
      variations,
      bookingFeeType: feeType,
      bookingFeeValue: feeValue,
    };
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
      {showCategories && <CategoryManager onClose={() => setShowCategories(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Serviços ({services.length})</h2>
          <p className="text-sm text-gray-500">Arraste para reordenar. A ordem reflete no app.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCategories(true)} className="flex items-center gap-2 border border-gray-200 hover:border-[#C9A4A0] text-gray-600 hover:text-[#C9A4A0] text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Tag className="w-4 h-4" /> Categorias
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Novo serviço
          </button>
        </div>
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
                      categoryList={categories}
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

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Categorias *</label>
                  <button type="button" onClick={() => setShowCategories(true)} className="text-xs text-[#C9A4A0] hover:text-[#b8918d] flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Gerenciar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <label key={cat.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:border-[#C9A4A0] hover:bg-[#C9A4A0]/5 transition-colors has-[:checked]:border-[#C9A4A0] has-[:checked]:bg-[#C9A4A0]/10">
                      <input
                        type="checkbox"
                        value={cat.key}
                        {...register('categories')}
                        className="w-4 h-4 accent-[#C9A4A0]"
                      />
                      <span className="text-sm text-gray-700">{cat.label}</span>
                    </label>
                  ))}
                </div>
                {errors.categories && <p className="text-red-500 text-xs mt-1">{errors.categories.message}</p>}
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
