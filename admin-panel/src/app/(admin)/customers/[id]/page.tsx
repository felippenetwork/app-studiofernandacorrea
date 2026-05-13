'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Ban, Calendar, Loader2, Save, Newspaper, CheckCircle } from 'lucide-react';
import { customersApi } from '@/lib/api';
import { formatDate, formatCurrency, formatRelative } from '@/lib/formatters';
import { getErrorMessage } from '@/lib/utils';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => customersApi.get(id),
  });

  const c = data?.customer;

  const { register, handleSubmit, formState: { isSubmitting, isDirty }, reset } = useForm({
    values: c ? {
      name:             c.name ?? '',
      email:            c.email ?? '',
      phone:            c.phone ?? '',
      birthDate:        c.birth_date ?? c.birthDate ?? '',
      internalNotes:    c.internal_notes ?? c.internalNotes ?? '',
      isBlocked:        c.is_blocked ?? c.isBlocked ?? false,
      canPost:          c.can_post ?? c.canPost ?? false,
      acceptsMarketing: c.accepts_marketing ?? c.acceptsMarketing ?? true,
      acceptsPush:      c.accepts_push ?? c.acceptsPush ?? true,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (formData: any) => customersApi.update(id, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-customer', id] });
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      reset(undefined, { keepValues: true });
    },
  });

  const appointments = data?.appointments ?? [];

  const statusColor: Record<string, string> = {
    confirmado:         'bg-green-100 text-green-700',
    pendente_pagamento: 'bg-yellow-100 text-yellow-700',
    cancelado:          'bg-red-100 text-red-700',
    concluido:          'bg-gray-100 text-gray-600',
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" /></div>;
  if (!c) return <p className="text-gray-500 text-sm p-4">Cliente não encontrada.</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Profile card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-[#C9A4A0]/20 flex items-center justify-center text-2xl font-bold text-[#C9A4A0] mx-auto mb-3">
              {c.name?.charAt(0)}
            </div>
            <h2 className="font-semibold text-gray-900">{c.name}</h2>
            <p className="text-sm text-gray-500">{c.email}</p>
            {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
            <div className="flex justify-center gap-2 mt-3 flex-wrap">
              {(c.is_blocked ?? c.isBlocked) && (
                <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  <Ban className="w-3 h-3" /> Bloqueada
                </span>
              )}
              {(c.can_post ?? c.canPost) && (
                <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  <Newspaper className="w-3 h-3" /> Feed
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2 text-sm border-t border-gray-50 pt-4">
            <div className="flex justify-between"><span className="text-gray-500">Cadastro</span><span className="text-gray-800">{formatRelative(c.createdAt ?? c.created_at)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Aniversário</span><span className="text-gray-800">{(c.birthDate ?? c.birth_date) ? formatDate(c.birthDate ?? c.birth_date) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Marketing</span><span className={(c.acceptsMarketing ?? c.accepts_marketing) ? 'text-green-600' : 'text-red-500'}>{(c.acceptsMarketing ?? c.accepts_marketing) ? 'Sim' : 'Não'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Push</span><span className={(c.acceptsPush ?? c.accepts_push) ? 'text-green-600' : 'text-red-500'}>{(c.acceptsPush ?? c.accepts_push) ? 'Sim' : 'Não'}</span></div>
          </div>
        </div>

        {/* Edit form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-5">Editar dados da cliente</h3>

          <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-5">

            {/* Dados principais */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dados pessoais</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input
                  {...register('name')}
                  placeholder="Nome da cliente"
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="email@exemplo.com"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    {...register('phone')}
                    placeholder="(11) 99999-0000"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
                <input
                  {...register('birthDate')}
                  type="date"
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Observações internas</p>
              <textarea
                {...register('internalNotes')}
                rows={3}
                placeholder="Notas visíveis apenas para admins…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none"
              />
            </div>

            {/* Flags */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Permissões</p>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input {...register('isBlocked')} type="checkbox" className="w-4 h-4 accent-red-500" /> Bloqueada
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input {...register('canPost')} type="checkbox" className="w-4 h-4 accent-emerald-500" /> Pode postar no feed
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input {...register('acceptsMarketing')} type="checkbox" className="w-4 h-4 accent-[#C9A4A0]" /> Aceita marketing
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input {...register('acceptsPush')} type="checkbox" className="w-4 h-4 accent-[#C9A4A0]" /> Aceita push
                </label>
              </div>
            </div>

            {updateMutation.isError && (
              <p className="text-sm text-red-600">{getErrorMessage(updateMutation.error)}</p>
            )}

            {updateMutation.isSuccess && !isDirty && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle className="w-4 h-4" /> Dados salvos com sucesso!
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </form>
        </div>
      </div>

      {/* Appointment history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#C9A4A0]" />
          <h3 className="font-semibold text-gray-900 text-sm">Histórico de agendamentos ({appointments.length})</h3>
        </div>
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhum agendamento.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/40">
                <th className="text-left px-5 py-2.5 text-xs text-gray-500">Data</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-500">Hora</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-500">Valor</th>
                <th className="text-left px-4 py-2.5 text-xs text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointments.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-800">{formatDate(a.appointment_date ?? a.appointmentDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{a.appointment_time ?? a.appointmentTime}</td>
                  <td className="px-4 py-3 text-gray-800">{formatCurrency(Number(a.service_price ?? a.servicePrice))}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
