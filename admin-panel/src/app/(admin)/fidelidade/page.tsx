'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Award, Star, Zap, Settings, Users, Loader2, Save,
  CheckCircle, Power, ChevronDown, ChevronUp, History, Gift,
} from 'lucide-react';
import { loyaltyApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoyaltySettings {
  isActive: boolean;
  pointsPerReal: number;
  silverThreshold: number;
  goldThreshold: number;
  redemptionThreshold: number;
  bronzeDiscount: number;
  silverDiscount: number;
  goldDiscount: number;
  couponValidityDays: number;
  visitRewardActive: boolean;
  visitRewardCount: number;
  visitRewardDiscountType: 'percentage' | 'fixed';
  visitRewardDiscountValue: number;
  visitRewardValidityDays: number;
}

interface CustomerRow {
  userId: string;
  name: string;
  email: string;
  balance: number;
  lifetimePoints: number;
  tier: 'bronze' | 'prata' | 'ouro';
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  bronze: { label: 'Bronze', bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-400', icon: '🥉' },
  prata:  { label: 'Prata',  bg: 'bg-slate-100', text: 'text-slate-600', bar: 'bg-slate-400', icon: '🥈' },
  ouro:   { label: 'Ouro',   bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-400', icon: '🥇' },
};

function TierBadge({ tier }: { tier: 'bronze' | 'prata' | 'ouro' }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Customer history drawer ───────────────────────────────────────────────────

function HistoryRow({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const { data: history, isLoading } = useQuery({
    queryKey: ['loyalty-history', userId],
    queryFn: () => loyaltyApi.getHistory(userId),
    enabled: open,
  });

  return (
    <>
      <tr
        className="hover:bg-gray-50/60 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <td colSpan={6} className="px-5 py-1.5">
          <span className="flex items-center gap-1.5 text-xs text-[#C9A4A0] hover:underline">
            <History className="w-3 h-3" />
            {open ? 'Ocultar histórico' : `Ver histórico de pontos`}
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </span>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="px-5 pb-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Carregando…
              </div>
            ) : !history?.length ? (
              <p className="text-xs text-gray-400 py-2">Nenhuma transação.</p>
            ) : (
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2 text-gray-500">Data</th>
                      <th className="text-left px-3 py-2 text-gray-500">Descrição</th>
                      <th className="text-right px-3 py-2 text-gray-500">Pts</th>
                      <th className="text-right px-3 py-2 text-gray-500">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map((h: any) => (
                      <tr key={h.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-1.5 text-gray-500">
                          {new Date(h.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-3 py-1.5 text-gray-700">{h.description}</td>
                        <td className={`px-3 py-1.5 text-right font-semibold ${h.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {h.points > 0 ? `+${h.points}` : h.points}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-600">{h.balance_after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Settings form ────────────────────────────────────────────────────────────

function SettingsForm({ settings }: { settings: LoyaltySettings }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isDirty, isSubmitting } } = useForm<LoyaltySettings>({
    values: settings,
  });

  const mutation = useMutation({
    mutationFn: (data: LoyaltySettings) => loyaltyApi.saveSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-settings'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => loyaltyApi.saveSettings({ isActive: active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-settings'] }),
  });

  const visitToggleMutation = useMutation({
    mutationFn: (active: boolean) => loyaltyApi.saveSettings({ visitRewardActive: active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-settings'] }),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      {/* Header with toggle */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#C9A4A0]" />
          <h3 className="font-semibold text-gray-900 text-sm">Configurações do Programa</h3>
        </div>
        <button
          onClick={() => toggleMutation.mutate(!settings.isActive)}
          disabled={toggleMutation.isPending}
          className={`flex items-center gap-2 h-8 px-4 rounded-lg text-xs font-semibold transition-colors ${
            settings.isActive
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          {toggleMutation.isPending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Power className="w-3.5 h-3.5" />}
          {settings.isActive ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-6">

        {/* Pontos */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Acúmulo de pontos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pontos por R$ 1 gasto
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                {...register('pointsPerReal', { valueAsNumber: true })}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
              />
              <p className="text-xs text-gray-400 mt-1">Ex: 1 → R$ 100 gasto = 100 pts</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pontos para resgatar cupom
              </label>
              <input
                type="number"
                min="1"
                {...register('redemptionThreshold', { valueAsNumber: true })}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
              />
              <p className="text-xs text-gray-400 mt-1">Ao atingir esse saldo, gera cupom automático</p>
            </div>
          </div>
        </div>

        {/* Tiers */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Níveis (pontos acumulados ao longo do tempo)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Bronze */}
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🥉</span>
                <span className="font-semibold text-amber-700 text-sm">Bronze</span>
              </div>
              <p className="text-xs text-gray-500">De 0 pts até Prata</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Desconto do cupom (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  {...register('bronzeDiscount', { valueAsNumber: true })}
                  className="w-full h-8 px-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                />
              </div>
            </div>

            {/* Prata */}
            <div className="rounded-xl border-2 border-slate-200 bg-slate-50/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🥈</span>
                <span className="font-semibold text-slate-600 text-sm">Prata</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">A partir de (pts)</label>
                <input
                  type="number"
                  min="1"
                  {...register('silverThreshold', { valueAsNumber: true })}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Desconto do cupom (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  {...register('silverDiscount', { valueAsNumber: true })}
                  className="w-full h-8 px-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
                />
              </div>
            </div>

            {/* Ouro */}
            <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🥇</span>
                <span className="font-semibold text-yellow-700 text-sm">Ouro</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">A partir de (pts)</label>
                <input
                  type="number"
                  min="1"
                  {...register('goldThreshold', { valueAsNumber: true })}
                  className="w-full h-8 px-2 border border-yellow-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Desconto do cupom (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  {...register('goldDiscount', { valueAsNumber: true })}
                  className="w-full h-8 px-2 border border-yellow-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cupom */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cupom de resgate</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validade do cupom (dias)</label>
            <input
              type="number"
              min="1"
              {...register('couponValidityDays', { valueAsNumber: true })}
              className="w-44 h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
            />
          </div>
        </div>

        {/* Recompensa por visitas */}
        <div className="space-y-3 border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#C9A4A0]" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recompensa por número de visitas</p>
            </div>
            <button
              type="button"
              onClick={() => visitToggleMutation.mutate(!settings.visitRewardActive)}
              disabled={visitToggleMutation.isPending}
              className={`flex items-center gap-2 h-8 px-4 rounded-lg text-xs font-semibold transition-colors ${
                settings.visitRewardActive
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {visitToggleMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Power className="w-3.5 h-3.5" />}
              {settings.visitRewardActive ? 'Ativo' : 'Inativo'}
            </button>
          </div>

          <div className="rounded-xl border-2 border-[#C9A4A0]/20 bg-[#C9A4A0]/5 p-4 space-y-4">
            <p className="text-xs text-gray-500">
              A cada <strong>N atendimentos concluídos</strong> o cliente recebe automaticamente um cupom — pode ser um serviço totalmente grátis (100%) ou um desconto fixo/percentual.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de atendimentos</label>
                <input
                  type="number"
                  min="1"
                  {...register('visitRewardCount', { valueAsNumber: true })}
                  className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
                />
                <p className="text-xs text-gray-400 mt-1">Ex: 10 → a cada 10 visitas ganha recompensa</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validade do cupom (dias)</label>
                <input
                  type="number"
                  min="1"
                  {...register('visitRewardValidityDays', { valueAsNumber: true })}
                  className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de desconto</label>
                <select
                  {...register('visitRewardDiscountType')}
                  className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white"
                >
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor do desconto</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('visitRewardDiscountValue', { valueAsNumber: true })}
                  className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
                />
                <p className="text-xs text-gray-400 mt-1">100% = serviço totalmente grátis</p>
              </div>
            </div>
          </div>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600">{getErrorMessage(mutation.error)}</p>
        )}
        {mutation.isSuccess && !isDirty && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle className="w-4 h-4" /> Configurações salvas!
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar configurações
        </button>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FidelidadePage() {
  const { data: settings, isLoading: loadingSettings } = useQuery<LoyaltySettings>({
    queryKey: ['loyalty-settings'],
    queryFn: loyaltyApi.getSettings,
  });

  const { data: customers = [], isLoading: loadingCustomers } = useQuery<CustomerRow[]>({
    queryKey: ['loyalty-customers'],
    queryFn: loyaltyApi.getCustomers,
  });

  const tierCounts = customers.reduce(
    (acc, c) => { acc[c.tier] = (acc[c.tier] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Programa de Fidelidade</h2>
        <p className="text-sm text-gray-500">
          Clientes acumulam pontos a cada atendimento e sobem de nível — Bronze, Prata e Ouro.
          Ao atingir o saldo de resgate, um cupom de desconto é gerado automaticamente.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#C9A4A0]/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-[#C9A4A0]" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold text-gray-900">{customers.length}</p>
          </div>
        </div>
        {(['bronze', 'prata', 'ouro'] as const).map((tier) => {
          const cfg = TIER_CONFIG[tier];
          return (
            <div key={tier} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center text-base`}>
                {cfg.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500">{cfg.label}</p>
                <p className="text-xl font-bold text-gray-900">{tierCounts[tier] ?? 0}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings */}
      {loadingSettings ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#C9A4A0]" /></div>
      ) : settings ? (
        <SettingsForm settings={settings} />
      ) : null}

      {/* Customer ranking */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#C9A4A0]" />
          <h3 className="font-semibold text-gray-900 text-sm">Ranking de clientes ({customers.length})</h3>
        </div>

        {loadingCustomers ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-[#C9A4A0] mx-auto" /></div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum cliente com pontos ainda.</p>
            <p className="text-xs text-gray-400 mt-1">Os pontos são creditados quando um atendimento é marcado como concluído.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nível</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Saldo</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Pts totais</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <>
                  <tr key={c.userId} className="border-t border-gray-50">
                    <td className="px-5 py-3 text-gray-400 text-xs font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="px-4 py-3"><TierBadge tier={c.tier} /></td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${c.balance > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                        {c.balance} pts
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">{c.lifetimePoints} pts</td>
                  </tr>
                  <HistoryRow key={`h-${c.userId}`} userId={c.userId} name={c.name} />
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
