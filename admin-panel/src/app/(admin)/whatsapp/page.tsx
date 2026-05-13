'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Settings, Zap, History, Wifi, WifiOff,
  CheckCircle, XCircle, Loader2, Save, Send, RefreshCw,
  Eye, EyeOff, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { whatsappApi, customersApi, WppConfig, WppTemplate, WppLog } from '@/lib/api';
import { cn, getErrorMessage } from '@/lib/utils';

type Tab = 'conexao' | 'envio' | 'historico';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'conexao',   label: 'Conexão & Mensagens', icon: Wifi },
  { key: 'envio',     label: 'Envio Manual',         icon: Send },
  { key: 'historico', label: 'Histórico',            icon: History },
];

const TRIGGER_DESC: Record<string, string> = {
  agendamento_confirmado: 'Disparada ao confirmar um agendamento no sistema',
  lembrete_24h:           'Enviada automaticamente 24h antes do agendamento',
  aniversario:            'Enviada no dia do aniversário da cliente (cron 08:00) — use {{cupom}} para incluir o código',
  retencao_30:            'Clientes sem visita há 30 dias',
  retencao_60:            'Clientes sem visita há 60 dias',
  retencao_90:            'Clientes sem visita há 90 dias',
  pos_atendimento:        'Enviada após agendamento ser marcado como Concluído',
};

function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Seção de templates (usada dentro da aba Conexão) ────────────────────────
function TemplatesSection() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState('');

  const { data: templates = [], isLoading } = useQuery<WppTemplate[]>({
    queryKey: ['wpp-templates'],
    queryFn:  whatsappApi.getTemplates,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      whatsappApi.updateTemplate(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wpp-templates'] }),
  });

  const saveMsgMut = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      whatsappApi.updateTemplate(id, { message }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wpp-templates'] }); setEditing(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-gray-400" />
        <h3 className="font-semibold text-gray-900">Mensagens Automáticas</h3>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        <strong>Variáveis disponíveis:</strong>{' '}
        {['nome','data','hora','profissional','servico','dias'].map((v) => (
          <code key={v} className="mx-0.5 bg-amber-100 px-1 rounded">{`{{${v}}}`}</code>
        ))}
        {' '}— clique na mensagem para editar
      </div>

      {isLoading
        ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#C9A4A0]" /></div>
        : templates.map((t) => (
          <div key={t.id} className={cn(
            'bg-white rounded-2xl border p-5 space-y-3 transition-colors',
            t.isActive ? 'border-[#C9A4A0]/30' : 'border-gray-100',
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', t.isActive ? 'bg-emerald-400' : 'bg-gray-300')} />
                  <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-4">{TRIGGER_DESC[t.trigger] ?? t.trigger}</p>
              </div>
              <button
                onClick={() => toggleMut.mutate({ id: t.id, isActive: !t.isActive })}
                disabled={toggleMut.isPending}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-colors',
                  t.isActive
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                )}>
                {t.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                {t.isActive ? 'Ativa' : 'Inativa'}
              </button>
            </div>

            {editing === t.id ? (
              <div className="space-y-2">
                <textarea
                  value={editMsg}
                  onChange={(e) => setEditMsg(e.target.value)}
                  rows={4}
                  className="w-full text-sm border border-[#C9A4A0]/40 rounded-xl px-3 py-2 resize-none focus:outline-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)}
                    className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button
                    onClick={() => saveMsgMut.mutate({ id: t.id, message: editMsg })}
                    disabled={saveMsgMut.isPending}
                    className="px-3 py-1.5 text-xs font-medium bg-[#C9A4A0] text-white rounded-lg hover:bg-[#b8918d] disabled:opacity-50 flex items-center gap-1">
                    {saveMsgMut.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-start justify-between gap-2 group cursor-pointer"
                onClick={() => { setEditing(t.id); setEditMsg(t.message); }}>
                <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{t.message}</p>
                <span className="text-[10px] text-[#C9A4A0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">editar</span>
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ─── Aba Conexão + Mensagens ──────────────────────────────────────────────────
function ConexaoTab() {
  const qc = useQueryClient();
  const [showKey, setShowKey]   = useState(false);
  const [apiUrl, setApiUrl]     = useState('');
  const [apiKey, setApiKey]     = useState('');
  const [instance, setInstance] = useState('');
  const [provider, setProvider] = useState('evolution');

  const { data: cfg, isLoading: loadingCfg } = useQuery<WppConfig | null>({
    queryKey: ['wpp-config'],
    queryFn:  whatsappApi.getConfig,
  });

  useEffect(() => {
    if (cfg) {
      setApiUrl(cfg.apiUrl ?? '');
      setApiKey(cfg.apiKey ?? '');
      setInstance(cfg.instanceName ?? '');
      setProvider(cfg.provider ?? 'evolution');
    }
  }, [cfg]);

  const { data: status, isLoading: loadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['wpp-status'],
    queryFn:  whatsappApi.getStatus,
    refetchInterval: provider === 'baileys' ? 5_000 : 15_000,
  });

  const saveMut = useMutation({
    mutationFn: () => whatsappApi.saveConfig({ provider, apiUrl, apiKey, instanceName: instance }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wpp-config'] }); refetchStatus(); },
  });

  const activeMut = useMutation({
    mutationFn: (active: boolean) => whatsappApi.setActive(active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wpp-config'] }),
  });

  const connectMut = useMutation({
    mutationFn: () => whatsappApi.connect(),
    onSuccess: () => { setTimeout(() => refetchStatus(), 2_000); },
  });

  const disconnectMut = useMutation({
    mutationFn: () => whatsappApi.disconnect(),
    onSuccess: () => { refetchStatus(); },
  });

  const connected  = status?.connected;
  const isBaileys  = provider === 'baileys' || cfg?.provider === 'baileys';
  const configured = isBaileys ? !!cfg : !!(cfg?.apiUrl && cfg?.instanceName);
  const canSave    = isBaileys ? true : !!(apiUrl && apiKey && instance);

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Status card */}
      <div className={cn(
        'rounded-2xl border-2 p-5 flex items-center gap-4',
        connected ? 'border-emerald-200 bg-emerald-50' : configured ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50',
      )}>
        {loadingStatus
          ? <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          : connected
            ? <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
            : <WifiOff className="w-8 h-8 text-amber-500 flex-shrink-0" />}
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            {connected ? 'WhatsApp Conectado' : configured ? 'Aguardando conexão' : 'Não configurado'}
          </p>
          <p className="text-sm text-gray-500">
            {connected
              ? isBaileys ? 'Baileys conectado (embutido no servidor)' : `Instância: ${cfg?.instanceName}`
              : status?.state ?? (isBaileys ? 'Clique em "Conectar" para gerar o QR Code' : 'Configure o provedor abaixo')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetchStatus()} className="p-2 rounded-lg hover:bg-white/60 text-gray-500 transition-colors" title="Atualizar status">
            <RefreshCw className="w-4 h-4" />
          </button>
          {configured && !isBaileys && (
            <button
              onClick={() => activeMut.mutate(!cfg?.isActive)}
              disabled={activeMut.isPending}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                cfg?.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
              )}>
              {cfg?.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {cfg?.isActive ? 'Desativar' : 'Ativar'}
            </button>
          )}
        </div>
      </div>

      {/* Baileys connect/disconnect */}
      {isBaileys && (
        <div className="flex gap-3">
          <button
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending || !!connected}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {connectMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            Conectar
          </button>
          <button
            onClick={() => disconnectMut.mutate()}
            disabled={disconnectMut.isPending || !connected}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {disconnectMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <WifiOff className="w-4 h-4" />}
            Desconectar
          </button>
        </div>
      )}

      {/* QR Code */}
      {status?.qrcode && !connected && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 flex flex-col items-center gap-3">
          <p className="text-sm font-semibold text-gray-700">Escaneie o QR Code com o WhatsApp</p>
          <img src={status.qrcode} alt="QR Code WhatsApp" className="w-48 h-48 rounded-xl border" />
          <p className="text-xs text-gray-400">
            {isBaileys ? 'Atualiza automaticamente a cada 5 segundos' : 'O código atualiza a cada 15 segundos'}
          </p>
        </div>
      )}

      {/* Config form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400" /> Configuração do Provedor
        </h3>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Provedor</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
            <option value="evolution">Evolution API (servidor externo)</option>
            <option value="baileys">Baileys (embutido — gratuito)</option>
            <option value="zapi">Z-API</option>
            <option value="generic">Genérico (HTTP)</option>
          </select>
          {provider === 'baileys' && (
            <p className="text-[10px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5 mt-2">
              Baileys roda diretamente no servidor, sem custo adicional. A sessão é salva no Supabase — não precisa escanear novamente após reiniciar.
            </p>
          )}
        </div>

        {provider !== 'baileys' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">URL da API</label>
              <input type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://sua-evolution-api.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A4A0]/60" />
              <p className="text-[10px] text-gray-400 mt-1">URL base da instância (sem barra no final)</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Chave de autenticação da API"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:border-[#C9A4A0]/60" />
                <button type="button" onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nome da Instância</label>
              <input type="text" value={instance} onChange={(e) => setInstance(e.target.value)}
                placeholder="studio-fernanda"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A4A0]/60" />
            </div>
          </>
        )}

        {saveMut.isError && <p className="text-xs text-red-600">{getErrorMessage(saveMut.error)}</p>}
        {saveMut.isSuccess && <p className="text-xs text-emerald-600">Configuração salva com sucesso!</p>}

        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || !canSave || loadingCfg}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
          {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Configuração
        </button>
      </div>

      {/* Templates de mensagens automáticas */}
      <TemplatesSection />
    </div>
  );
}

// ─── Aba Envio Manual ─────────────────────────────────────────────────────────
function EnvioTab() {
  const [clientSearch, setClientSearch]     = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showDrop, setShowDrop]             = useState(false);
  const [message, setMessage]               = useState('');

  const { data: templates = [] } = useQuery<WppTemplate[]>({ queryKey: ['wpp-templates'], queryFn: whatsappApi.getTemplates });

  const { data: searchRes = [] } = useQuery({
    queryKey: ['cs', clientSearch],
    queryFn: () => customersApi.list({ search: clientSearch, limit: 8 }),
    enabled: clientSearch.length >= 2 && !selectedClient,
    staleTime: 10_000,
  });
  const clients: any[] = Array.isArray(searchRes) ? searchRes : (searchRes as any)?.items ?? [];

  const sendMut = useMutation({
    mutationFn: () => whatsappApi.send({
      phone:         selectedClient!.phone,
      message,
      recipientName: selectedClient!.name,
      recipientId:   selectedClient!.id,
      trigger:       'manual',
    }),
    onSuccess: () => { setMessage(''); setSelectedClient(null); setClientSearch(''); },
  });

  return (
    <div className="space-y-5 max-w-lg">
      <div className="relative">
        <label className="text-xs font-medium text-gray-500 mb-1 block">Cliente</label>
        {selectedClient ? (
          <div className="flex items-center gap-3 px-3 py-2 border border-[#C9A4A0]/50 rounded-xl bg-[#C9A4A0]/5">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{selectedClient.name}</p>
              <p className="text-xs text-gray-500">{selectedClient.phone ?? '(sem telefone)'}</p>
            </div>
            <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-red-500">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input type="text" placeholder="Buscar cliente por nome ou telefone…"
              value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A4A0]/60" />
            {showDrop && clients.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {clients.filter((c: any) => c.phone).map((c: any) => (
                  <button key={c.id} type="button"
                    onMouseDown={() => { setSelectedClient(c); setClientSearch(''); setShowDrop(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                    <span className="text-sm font-medium text-gray-900">{c.name}</span>
                    <span className="text-xs text-gray-400">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {showDrop && clientSearch.length >= 2 && clients.filter((c: any) => c.phone).length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 px-3 py-2 text-xs text-gray-400">
                Nenhum cliente com telefone encontrado
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Usar template</label>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button key={t.id} type="button" onClick={() => {
              const filled = t.message.replace(/\{\{nome\}\}/g, selectedClient?.name ?? '{{nome}}');
              setMessage(filled);
            }}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg text-gray-600 hover:border-[#C9A4A0]/50 hover:text-[#C9A4A0] transition-colors">
              {t.name}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Edite as variáveis antes de enviar:{' '}
          {['data','hora','profissional','servico','dias'].map((v) => (
            <code key={v} className="bg-gray-100 px-1 rounded mx-0.5">{`{{${v}}}`}</code>
          ))}
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Mensagem</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)}
          rows={5} placeholder="Digite a mensagem ou selecione um template acima…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C9A4A0]/60" />
        <p className="text-[10px] text-gray-400 text-right mt-0.5">{message.length} caracteres</p>
      </div>

      {sendMut.isError && <p className="text-xs text-red-600">{getErrorMessage(sendMut.error)}</p>}
      {sendMut.isSuccess && <p className="text-xs text-emerald-600">Mensagem enviada com sucesso!</p>}

      <button
        onClick={() => sendMut.mutate()}
        disabled={!selectedClient?.phone || !message.trim() || sendMut.isPending}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
        {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Enviar WhatsApp
      </button>
    </div>
  );
}

// ─── Aba Histórico ────────────────────────────────────────────────────────────
function HistoricoTab() {
  const { data: log = [], isLoading } = useQuery<WppLog[]>({
    queryKey: ['wpp-log'],
    queryFn: () => whatsappApi.getLog(100),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" /></div>;
  if (log.length === 0) return (
    <div className="flex flex-col items-center py-16 text-gray-400">
      <History className="w-8 h-8 mb-2" />
      <p className="text-sm">Nenhuma mensagem enviada ainda</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Mensagem</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Gatilho</th>
            <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Enviado em</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {log.map((entry) => (
            <tr key={entry.id} className="hover:bg-gray-50/50">
              <td className="px-5 py-3">
                <p className="text-sm font-medium text-gray-900">{entry.recipientName ?? '—'}</p>
                <p className="text-xs text-gray-400">{entry.phone}</p>
              </td>
              <td className="px-4 py-3 hidden md:table-cell max-w-xs">
                <p className="text-xs text-gray-600 truncate">{entry.message}</p>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-xs text-gray-500">{entry.trigger ?? 'manual'}</span>
              </td>
              <td className="px-4 py-3 text-center">
                {entry.status === 'sent'
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"><CheckCircle className="w-3 h-3" />Enviado</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium"><XCircle className="w-3 h-3" />Falhou</span>}
              </td>
              <td className="px-4 py-3">
                <p className="text-xs text-gray-500">{formatDate(entry.sentAt)}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>('conexao');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[#25D366]" />
          WhatsApp
        </h1>
        <p className="text-sm text-gray-500 mt-1">Configure a integração e automatize mensagens para as clientes</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'conexao'   && <ConexaoTab />}
      {tab === 'envio'     && <EnvioTab />}
      {tab === 'historico' && <HistoricoTab />}
    </div>
  );
}
