'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Percent, CheckCircle2, Loader2, X, ChevronDown, FileText, Printer } from 'lucide-react';
import { commissionsApi, professionalsApi, servicesApi } from '@/lib/api';
import { Professional, Service, CommissionRate, CommissionRecord, CommissionSummary } from '@/types';
import { cn, getErrorMessage } from '@/lib/utils';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_BADGE: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  pago:     'bg-green-100 text-green-700',
};

// ─── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ from, to }: { from: string; to: string }) {
  const { data: summary = [], isLoading } = useQuery<CommissionSummary[]>({
    queryKey: ['commission-summary', from, to],
    queryFn:  () => commissionsApi.getSummary({ from, to }),
    staleTime: 30_000,
  });

  const totalPendente = summary.reduce((s, r) => s + r.total_pendente, 0);
  const totalPago     = summary.reduce((s, r) => s + r.total_pago, 0);

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#C9A4A0]" /></div>;

  return (
    <div className="space-y-4">
      {/* Totals row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Total a Repassar</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{formatBRL(totalPendente)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total Repassado</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatBRL(totalPago)}</p>
        </div>
      </div>

      {/* By professional */}
      {summary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-medium text-gray-700">Por profissional</p>
          </div>
          <div className="divide-y divide-gray-50">
            {summary.map((row) => (
              <div key={row.professional_id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{row.professional_name}</p>
                  <p className="text-xs text-gray-400">{row.count_pendente} pendente{row.count_pendente !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-600">{formatBRL(row.total_pendente)}</p>
                  {row.total_pago > 0 && <p className="text-xs text-green-600">{formatBRL(row.total_pago)} pago</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Commission Rates Tab ──────────────────────────────────────────────────────

function RatesTab() {
  const qc = useQueryClient();
  const [filterPro, setFilterPro] = useState('todos');
  const [editing, setEditing] = useState<{ proId: string; svcId: string; value: string } | null>(null);

  const { data: professionals = [] } = useQuery<Professional[]>({ queryKey: ['professionals'], queryFn: () => professionalsApi.list(), staleTime: 5 * 60_000 });
  const { data: services = [] } = useQuery<Service[]>({ queryKey: ['services'], queryFn: () => servicesApi.list(), staleTime: 5 * 60_000 });
  const { data: rates = [] } = useQuery<CommissionRate[]>({ queryKey: ['commission-rates'], queryFn: () => commissionsApi.getRates(), staleTime: 30_000 });

  const saveMutation = useMutation({
    mutationFn: (data: { professionalId: string; serviceId: string; percentage: number }) =>
      commissionsApi.setRate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commission-rates'] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (data: { professionalId: string; serviceId: string }) => commissionsApi.deleteRate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commission-rates'] }),
  });

  const getRate = (proId: string, svcId: string) =>
    rates.find((r) => r.professional_id === proId && r.service_id === svcId);

  const filteredPros = filterPro === 'todos' ? professionals : professionals.filter((p) => p.id === filterPro);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={filterPro} onChange={(e) => setFilterPro(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700">
          <option value="todos">Todos os profissionais</option>
          {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <p className="text-xs text-gray-400">Clique no percentual para editar</p>
      </div>

      {filteredPros.map((pro) => (
        <div key={pro.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">{pro.name}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {services.filter((s) => s.isActive).map((svc) => {
              const rate    = getRate(pro.id, svc.id);
              const isEdit  = editing?.proId === pro.id && editing?.svcId === svc.id;
              return (
                <div key={svc.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-sm text-gray-900">{svc.name}</p>
                    <p className="text-xs text-gray-400">{svc.category} · {formatBRL(svc.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEdit ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={editing.value}
                          onChange={(e) => setEditing((prev) => prev ? { ...prev, value: e.target.value } : null)}
                          className="w-16 border border-[#C9A4A0] rounded-lg px-2 py-1 text-sm text-right"
                          autoFocus
                        />
                        <span className="text-xs text-gray-400">%</span>
                        <button
                          onClick={() => saveMutation.mutate({ professionalId: pro.id, serviceId: svc.id, percentage: parseFloat(editing.value) })}
                          disabled={saveMutation.isPending}
                          className="px-2 py-1 bg-[#C9A4A0] text-white rounded-lg text-xs font-medium hover:bg-[#b8918d] disabled:opacity-50"
                        >
                          {saveMutation.isPending ? '…' : 'Salvar'}
                        </button>
                        <button onClick={() => setEditing(null)} className="p-1 hover:bg-gray-100 rounded">
                          <X className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing({ proId: pro.id, svcId: svc.id, value: String(rate?.commission_percentage ?? '') })}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium transition-colors',
                          rate
                            ? 'bg-[#C9A4A0]/10 text-[#C9A4A0] hover:bg-[#C9A4A0]/20'
                            : 'text-gray-300 border border-dashed border-gray-200 hover:border-[#C9A4A0]/40 hover:text-[#C9A4A0]',
                        )}
                      >
                        <Percent className="w-3 h-3" />
                        {rate ? `${rate.commission_percentage}%` : 'Definir'}
                      </button>
                    )}
                    {rate && !isEdit && (
                      <button onClick={() => deleteMutation.mutate({ professionalId: pro.id, serviceId: svc.id })}
                        className="p-1 hover:text-red-400 text-gray-200 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filteredPros.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Percent className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum profissional encontrado</p>
        </div>
      )}
    </div>
  );
}

// ─── Records Tab ───────────────────────────────────────────────────────────────

function RecordsTab() {
  const qc = useQueryClient();
  const [filterPro, setFilterPro]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom]   = useState('');
  const [filterTo, setFilterTo]       = useState('');
  const [selected, setSelected]       = useState<string[]>([]);
  const [payNotes, setPayNotes]       = useState('');
  const [payModal, setPayModal]       = useState(false);
  const [page, setPage]               = useState(1);

  const { data: professionals = [] } = useQuery<Professional[]>({ queryKey: ['professionals'], queryFn: () => professionalsApi.list(), staleTime: 5 * 60_000 });

  const { data, isLoading } = useQuery({
    queryKey: ['commission-records', filterPro, filterStatus, filterFrom, filterTo, page],
    queryFn: () => commissionsApi.getRecords({
      professionalId: filterPro || undefined,
      status:         filterStatus || undefined,
      from:           filterFrom || undefined,
      to:             filterTo || undefined,
      page, limit: 25,
    }),
    staleTime: 30_000,
  });

  const records: CommissionRecord[] = (data as any)?.items ?? [];
  const total: number               = (data as any)?.total ?? 0;

  const payMutation = useMutation({
    mutationFn: () => commissionsApi.pay(selected, payNotes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-records'] });
      qc.invalidateQueries({ queryKey: ['commission-summary'] });
      setSelected([]); setPayModal(false); setPayNotes('');
    },
  });

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const pendentes = records.filter((r) => r.status === 'pendente');
  const allPendentesSelected = pendentes.length > 0 && pendentes.every((r) => selected.includes(r.id));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterPro} onChange={(e) => { setFilterPro(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700">
          <option value="">Todos os profissionais</option>
          {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700">
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
        </select>
        <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700" placeholder="De" />
        <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700" placeholder="Até" />
      </div>

      {/* Batch action bar */}
      {selected.length > 0 && (
        <div className="flex items-center justify-between bg-[#C9A4A0]/10 border border-[#C9A4A0]/30 rounded-xl px-4 py-2.5">
          <p className="text-sm text-[#C9A4A0] font-medium">{selected.length} selecionada(s)</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected([])} className="text-xs text-gray-500 hover:text-gray-700">Limpar</button>
            <button onClick={() => setPayModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A4A0] text-white text-xs font-medium rounded-lg hover:bg-[#b8918d]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marcar como pago
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left w-8">
                <input type="checkbox"
                  checked={allPendentesSelected}
                  onChange={() => setSelected(allPendentesSelected ? [] : pendentes.map((r) => r.id))}
                  className="w-4 h-4 accent-[#C9A4A0]"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Profissional</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Serviço</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor serv.</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Comissão</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#C9A4A0] mx-auto" /></td></tr>
            )}
            {!isLoading && records.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">Nenhum registro encontrado</td></tr>
            )}
            {records.map((rec) => (
              <tr key={rec.id} className={cn('hover:bg-gray-50 transition-colors', selected.includes(rec.id) && 'bg-[#C9A4A0]/5')}>
                <td className="px-4 py-3">
                  <input type="checkbox"
                    checked={selected.includes(rec.id)}
                    disabled={rec.status === 'pago'}
                    onChange={() => toggleSelect(rec.id)}
                    className="w-4 h-4 accent-[#C9A4A0] disabled:opacity-30"
                  />
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {rec.appointment?.appointment_date
                    ? new Date(rec.appointment.appointment_date + 'T12:00:00').toLocaleDateString('pt-BR')
                    : new Date(rec.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{rec.professional?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{rec.service?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatBRL(rec.service_price)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{rec.commission_percentage}%</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatBRL(rec.commission_amount)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[rec.status])}>
                    {rec.status === 'pendente' ? 'Pendente' : 'Pago'}
                  </span>
                  {rec.paid_at && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{new Date(rec.paid_at).toLocaleDateString('pt-BR')}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>{total} registros</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Anterior</button>
            <button disabled={page * 25 >= total} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Próximo</button>
          </div>
        </div>
      )}

      {/* Pay modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">Confirmar Repasse</h2>
              <button onClick={() => setPayModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Marcar <span className="font-semibold text-gray-900">{selected.length}</span> comissão(ões) como pagas?
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatBRL(records.filter((r) => selected.includes(r.id)).reduce((s, r) => s + r.commission_amount, 0))}
              </p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Observação (opcional)</label>
                <input type="text" placeholder="Ex: Pix 13/05, Transferência…" value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setPayModal(false)} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
                <button onClick={() => payMutation.mutate()} disabled={payMutation.isPending}
                  className="flex-1 py-2 text-sm font-medium bg-[#C9A4A0] text-white rounded-xl hover:bg-[#b8918d] disabled:opacity-50 flex items-center justify-center gap-2">
                  {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {payMutation.isPending ? 'Salvando…' : 'Confirmar Repasse'}
                </button>
              </div>
              {payMutation.isError && <p className="text-xs text-red-500 text-center">{getErrorMessage(payMutation.error)}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Relatório Tab ─────────────────────────────────────────────────────────────

function RelatorioTab() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const [filterPro,  setFilterPro]  = useState('');
  const [filterFrom, setFilterFrom] = useState(monthStart);
  const [filterTo,   setFilterTo]   = useState(today);
  const [fetched,    setFetched]    = useState(false);

  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['professionals'],
    queryFn: () => professionalsApi.list(),
    staleTime: 5 * 60_000,
  });

  const { data: items = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['commission-report', filterPro, filterFrom, filterTo],
    queryFn: () => commissionsApi.getReport({ professionalId: filterPro, from: filterFrom, to: filterTo }),
    enabled: false,
    staleTime: 30_000,
  });

  const selectedPro = professionals.find((p) => p.id === filterPro);
  const total = items.reduce((s, r) => s + Number(r.commission_amount), 0);

  function fmtDate(d: string) {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  function methodLabel(method?: string | null) {
    if (!method) return '—';
    const map: Record<string, string> = {
      pix: 'PIX',
      credit_card: 'Crédito',
      debit_card: 'Débito',
      cash: 'Dinheiro',
    };
    return map[method] ?? method;
  }

  const handleGenerate = async () => {
    if (!filterPro) return;
    setFetched(true);
    refetch();
  };

  const handlePrint = () => {
    if (!selectedPro || !items.length) return;
    const fromLabel = fmtDate(filterFrom);
    const toLabel   = fmtDate(filterTo);

    const rows = items.map((item: any) => {
      const apptDate = item.appointment?.appointment_date ?? '';
      const dateStr  = apptDate ? fmtDate(apptDate) : '—';
      const client   = item.appointment?.client_name ?? '—';
      const method   = methodLabel(item.appointment?.payment_method);
      return `
        <tr>
          <td style="text-align:center">${dateStr}</td>
          <td style="text-align:center">${dateStr}</td>
          <td style="text-align:center">${dateStr}</td>
          <td>${client}</td>
          <td>${item.service?.name ?? '—'}</td>
          <td style="text-align:right">${Number(item.service_price).toFixed(2)}</td>
          <td style="text-align:center">${method}</td>
          <td style="text-align:right">${Number(item.commission_amount).toFixed(2)}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Relatório – ${selectedPro.name}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:24px 30px}
        .hdr{text-align:center;margin-bottom:22px}
        .hdr .studio{font-size:13px;font-weight:bold}
        .hdr .title{font-size:17px;font-weight:bold;margin-top:14px}
        .hdr .name{font-size:14px;font-weight:bold}
        .hdr .period{font-size:11px;margin-top:4px}
        .sec{font-size:12px;font-weight:bold;text-transform:uppercase;margin:18px 0 5px}
        .sub{font-style:italic;margin-bottom:8px;font-size:11px}
        table{width:100%;border-collapse:collapse}
        th{background:#f3f4f6;font-weight:600;text-align:center;border:1px solid #999;padding:6px 8px;font-size:10px}
        td{border:1px solid #ccc;padding:5px 8px;font-size:10px;vertical-align:middle}
        tfoot td{font-weight:bold;background:#f9fafb}
        @page{margin:12mm 10mm}
      </style></head><body>
      <div class="hdr">
        <div class="studio">Studio Fernanda Corrêa Beauty</div>
        <div class="title">RESUMO FINANCEIRO</div>
        <div class="name">${selectedPro.name.toUpperCase()}</div>
        <div class="period">Período de Pagamento: ${fromLabel} a ${toLabel}</div>
      </div>
      <div class="sec">Descritivo das Receitas Variáveis no Período</div>
      <div class="sub">Sobre Serviços</div>
      <table>
        <thead><tr>
          <th>Data do<br>Atendimento</th>
          <th>Data do<br>Pagamento</th>
          <th>Liberação do<br>Valor Profissional</th>
          <th>Cliente</th>
          <th>Serviço</th>
          <th>Valor R$</th>
          <th>Forma de<br>Pagamento</th>
          <th>Valor<br>Profissional R$</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="7" style="text-align:right">Total</td>
          <td style="text-align:right">${total.toFixed(2)}</td>
        </tr></tfoot>
      </table>
      <script>window.onload=()=>window.print();</script>
    </body></html>`;

    const w = window.open('', '_blank', 'width=1000,height=760');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end bg-white border border-gray-100 rounded-xl p-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Profissional *</label>
          <select value={filterPro} onChange={(e) => { setFilterPro(e.target.value); setFetched(false); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 min-w-[200px]">
            <option value="">Selecione um profissional</option>
            {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">De</label>
          <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setFetched(false); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Até</label>
          <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setFetched(false); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700" />
        </div>
        <button onClick={handleGenerate} disabled={!filterPro || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A4A0] text-white text-sm font-semibold rounded-lg hover:bg-[#b8918d] disabled:opacity-50 transition-colors">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Gerar Relatório
        </button>
        {fetched && items.length > 0 && (
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </button>
        )}
      </div>

      {/* Empty state */}
      {fetched && !isLoading && items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum registro de comissão encontrado para o período.</p>
          <p className="text-xs mt-1 text-gray-300">Verifique se os agendamentos foram concluídos e têm comissão configurada.</p>
        </div>
      )}

      {/* Preview table */}
      {fetched && items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Report header preview */}
          <div className="p-6 border-b border-gray-100 text-center bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Studio Fernanda Corrêa Beauty</p>
            <p className="text-lg font-bold text-gray-900 mt-2">RESUMO FINANCEIRO</p>
            <p className="text-base font-bold text-gray-800">{selectedPro?.name?.toUpperCase()}</p>
            <p className="text-sm text-gray-500 mt-1">
              Período de Pagamento: {fmtDate(filterFrom)} a {fmtDate(filterTo)}
            </p>
          </div>

          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Descritivo das Receitas Variáveis no Período</p>
            <p className="text-xs italic text-gray-500 mt-2 mb-3">Sobre Serviços</p>
          </div>

          <div className="overflow-x-auto px-4 pb-6">
            <table className="w-full text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  {['Data do Atendimento','Data do Pagamento','Liberação do Valor Profissional','Cliente','Serviço','Valor R$','Forma de Pagamento','Valor Profissional R$'].map((h) => (
                    <th key={h} className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => {
                  const apptDate = item.appointment?.appointment_date ?? '';
                  const dateStr  = apptDate ? fmtDate(apptDate) : '—';
                  const client   = item.appointment?.client_name ?? '—';
                  const method   = methodLabel(item.appointment?.payment_method);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-3 py-2 text-center whitespace-nowrap">{dateStr}</td>
                      <td className="border border-gray-200 px-3 py-2 text-center whitespace-nowrap">{dateStr}</td>
                      <td className="border border-gray-200 px-3 py-2 text-center whitespace-nowrap">{dateStr}</td>
                      <td className="border border-gray-200 px-3 py-2">{client}</td>
                      <td className="border border-gray-200 px-3 py-2">{item.service?.name ?? '—'}</td>
                      <td className="border border-gray-200 px-3 py-2 text-right whitespace-nowrap">{Number(item.service_price).toFixed(2)}</td>
                      <td className="border border-gray-200 px-3 py-2 text-center">{method}</td>
                      <td className="border border-gray-200 px-3 py-2 text-right font-semibold whitespace-nowrap">{Number(item.commission_amount).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={7} className="border border-gray-300 px-3 py-2.5 text-right text-sm text-gray-900">Total</td>
                  <td className="border border-gray-300 px-3 py-2.5 text-right text-sm text-gray-900">{total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'taxas' | 'registros' | 'relatorio';

export default function ComissoesPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard',  label: 'Dashboard' },
    { id: 'taxas',      label: 'Configurar Taxas' },
    { id: 'registros',  label: 'Registros & Repasse' },
    { id: 'relatorio',  label: 'Relatório de Fechamento' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Comissões</h1>
        <p className="text-sm text-gray-500 mt-1">Taxas por profissional e controle de repasse</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard'  && <SummaryCards from={monthStart} to={today} />}
      {tab === 'taxas'      && <RatesTab />}
      {tab === 'registros'  && <RecordsTab />}
      {tab === 'relatorio'  && <RelatorioTab />}
    </div>
  );
}
