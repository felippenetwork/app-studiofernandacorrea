'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Crown, Ban, Calendar, Loader2, Save } from 'lucide-react';
import { customersApi } from '@/lib/api';
import { formatDate, formatCurrency, formatRelative } from '@/lib/formatters';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => customersApi.get(id),
  });

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    values: data?.customer ? {
      isVip: data.customer.isVip ?? false,
      isBlocked: data.customer.isBlocked ?? false,
      birthDate: data.customer.birthDate ?? '',
      acceptsMarketing: data.customer.acceptsMarketing ?? true,
      acceptsPush: data.customer.acceptsPush ?? true,
      internalNotes: data.customer.internalNotes ?? '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (formData: any) => customersApi.update(id, formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-customer', id] }); qc.invalidateQueries({ queryKey: ['admin-customers'] }); },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" /></div>;

  const c = data?.customer;
  const appointments = data?.appointments ?? [];

  if (!c) return <p className="text-gray-500 text-sm p-4">Cliente não encontrada.</p>;

  const statusColor: Record<string, string> = {
    confirmado: 'bg-green-100 text-green-700',
    pendente_pagamento: 'bg-yellow-100 text-yellow-700',
    cancelado: 'bg-red-100 text-red-700',
    concluido: 'bg-gray-100 text-gray-600',
  };

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
              {c.name.charAt(0)}
            </div>
            <h2 className="font-semibold text-gray-900">{c.name}</h2>
            <p className="text-sm text-gray-500">{c.email}</p>
            {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
            <div className="flex justify-center gap-2 mt-3">
              {c.isVip && <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" /> VIP</span>}
              {c.isBlocked && <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"><Ban className="w-3 h-3" /> Bloqueada</span>}
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Cadastro</span><span className="text-gray-800">{formatRelative(c.createdAt)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Aniversário</span><span className="text-gray-800">{c.birthDate ? formatDate(c.birthDate) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Marketing</span><span className={c.acceptsMarketing ? 'text-green-600' : 'text-red-500'}>{c.acceptsMarketing ? 'Sim' : 'Não'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Push</span><span className={c.acceptsPush ? 'text-green-600' : 'text-red-500'}>{c.acceptsPush ? 'Sim' : 'Não'}</span></div>
          </div>
        </div>

        {/* Edit form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Editar dados internos</h3>
          <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento</label>
              <input {...register('birthDate')} type="date" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações internas</label>
              <textarea {...register('internalNotes')} rows={3} placeholder="Notas visíveis apenas para admins…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none" />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input {...register('isVip')} type="checkbox" className="w-4 h-4 accent-amber-500" /> VIP</label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input {...register('isBlocked')} type="checkbox" className="w-4 h-4 accent-red-500" /> Bloqueada</label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input {...register('acceptsMarketing')} type="checkbox" className="w-4 h-4 accent-[#C9A4A0]" /> Aceita marketing</label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input {...register('acceptsPush')} type="checkbox" className="w-4 h-4 accent-[#C9A4A0]" /> Aceita push</label>
            </div>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? 'Salvando…' : 'Salvar'}
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[a.status] ?? 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
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
