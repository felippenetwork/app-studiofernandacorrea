'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Cake, Play, Loader2, Save, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { birthdayApi } from '@/lib/api';
import { BirthdaySettings } from '@/types';
import { getErrorMessage, cn } from '@/lib/utils';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}));

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function BirthdayCalendar() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear]   = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // When the admin panel is left open across a year boundary, reset to
  // the real current month/year so the grid layout and today-highlight stay correct.
  useEffect(() => {
    const check = () => {
      const realNow = new Date();
      const realYear = realNow.getFullYear();
      setYear(prev => {
        if (prev !== realYear) {
          setMonth(realNow.getMonth() + 1);
          setSelectedDay(null);
          return realYear;
        }
        return prev;
      });
    };
    const id = setInterval(check, 60_000); // check every minute
    return () => clearInterval(id);
  }, []);

  const { data: calData = {}, isFetching } = useQuery<Record<number, string[]>>({
    queryKey: ['birthday-calendar', year, month],
    queryFn: () => birthdayApi.calendar(month),
    staleTime: 5 * 60 * 1000,
  });

  function prev() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function next() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  // Build calendar grid cells
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth  = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayDay = now.getMonth() + 1 === month && now.getFullYear() === year ? now.getDate() : null;
  const totalBirthdays = Object.values(calData).reduce((s, a) => s + a.length, 0);
  const selectedNames  = selectedDay ? (calData[selectedDay] ?? []) : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Cake className="w-4 h-4 text-pink-400" />
          <span className="font-semibold text-gray-900 text-sm">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        </div>
        <div className="flex items-center gap-1">
          {totalBirthdays > 0 && (
            <span className="text-xs text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full mr-2">
              {totalBirthdays} aniversariante{totalBirthdays !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const hasBirthday   = day !== null && (calData[day]?.length ?? 0) > 0;
          const isToday       = day === todayDay;
          const isSelected    = day === selectedDay;
          const count         = day ? (calData[day]?.length ?? 0) : 0;

          return (
            <div
              key={idx}
              onClick={() => {
                if (!day || !hasBirthday) { setSelectedDay(null); return; }
                setSelectedDay(isSelected ? null : day);
              }}
              className={cn(
                'relative flex flex-col items-center justify-start py-2 min-h-[52px] border-b border-r border-gray-50 transition-colors',
                day && hasBirthday && 'cursor-pointer hover:bg-pink-50',
                !day && 'bg-gray-50/40',
                isSelected && 'bg-pink-50',
              )}
            >
              {day && (
                <>
                  <span className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium',
                    isToday   && 'bg-[#C9A4A0] text-white',
                    !isToday && isSelected && 'text-pink-700 font-semibold',
                    !isToday && !isSelected && (hasBirthday ? 'text-gray-800' : 'text-gray-400'),
                  )}>
                    {day}
                  </span>

                  {hasBirthday && (
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                      ))}
                      {count > 3 && <span className="text-[9px] text-pink-400 leading-none">+</span>}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day panel */}
      {selectedDay && selectedNames.length > 0 && (
        <div className="px-5 py-4 bg-pink-50 border-t border-pink-100">
          <p className="text-xs font-semibold text-pink-700 mb-2 uppercase tracking-wide">
            🎂 {selectedDay} de {MONTH_NAMES[month - 1]}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedNames.map((name) => (
              <span key={name} className="inline-flex items-center gap-1.5 bg-white border border-pink-200 text-pink-800 text-sm px-3 py-1 rounded-full shadow-sm">
                <span className="w-5 h-5 rounded-full bg-pink-200 flex items-center justify-center text-xs font-bold text-pink-700">
                  {name.charAt(0)}
                </span>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty month hint */}
      {!isFetching && totalBirthdays === 0 && (
        <div className="px-5 py-4 border-t border-gray-100 flex items-start gap-2 text-sm text-gray-400">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Nenhum aniversário cadastrado em {MONTH_NAMES[month - 1]}.
            Os aniversários aparecem quando a cliente preenche a data de nascimento no app
            (Perfil → Editar perfil) ou quando você edita a ficha dela em{' '}
            <a href="/customers" className="text-[#C9A4A0] hover:underline">Clientes</a>.
          </span>
        </div>
      )}
    </div>
  );
}

export default function BirthdayPage() {
  const qc = useQueryClient();
  const [runResult, setRunResult] = useState<{ processed: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery<BirthdaySettings>({
    queryKey: ['birthday-settings'],
    queryFn: birthdayApi.getSettings,
  });

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<BirthdaySettings>({
    values: settings ?? undefined,
  });

  const updateMutation = useMutation({
    mutationFn: birthdayApi.updateSettings,
    onSuccess: (data) => {
      qc.setQueryData(['birthday-settings'], data);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      setError(null);
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const runMutation = useMutation({
    mutationFn: birthdayApi.runNow,
    onSuccess: (data) => { setRunResult(data.data); setError(null); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const isActive   = watch('isActive',           settings?.isActive           ?? false);
  const sendHour   = watch('sendHour',            settings?.sendHour           ?? 8);
  const validDays  = watch('couponValidityDays',  settings?.couponValidityDays ?? 30);
  const couponType = watch('couponType',          settings?.couponType         ?? 'fixed');
  const couponVal  = watch('couponValue',         settings?.couponValue        ?? 20);

  if (isLoading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" />
    </div>
  );

  const sendHourLabel = `${String(sendHour).padStart(2, '0')}:00`;
  const couponPreview = couponType === 'fixed'
    ? `R$ ${Number(couponVal).toFixed(2)} de desconto`
    : `${couponVal}% de desconto`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
          <Cake className="w-5 h-5 text-pink-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Automação de Aniversário</h2>
          <p className="text-sm text-gray-500">Cupom único enviado automaticamente no dia do aniversário de cada cliente.</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {saved && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
          ✓ Configurações salvas — passam a valer imediatamente.
        </div>
      )}

      {runResult && (
        <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
          <p className="text-sm font-medium text-pink-800">Automação executada!</p>
          <p className="text-sm text-pink-700 mt-1">
            {runResult.processed} aniversariante(s) recebeu cupom ·{' '}
            {runResult.skipped} já tinha(m) recebido este ano.
          </p>
        </div>
      )}

      <BirthdayCalendar />

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">

        {/* Toggle ativo */}
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="font-medium text-gray-900 text-sm">Automação ativa</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isActive
                ? `✓ Enviando cupons todos os dias às ${sendHourLabel} (horário de Brasília).`
                : 'Desativada — nenhum cupom será enviado automaticamente.'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input {...register('isActive')} type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9A4A0]" />
          </label>
        </div>

        {/* Horário de envio */}
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Horário de envio</label>
          <select
            {...register('sendHour', { valueAsNumber: true })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
          >
            {HOUR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Horário de Brasília (BRT). Alterar aqui já vale para o próximo disparo — sem precisar reiniciar o servidor.
          </p>
        </div>

        {/* Cupom */}
        <div className="p-5 space-y-4">
          <p className="text-sm font-medium text-gray-700">Configuração do cupom</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de desconto</label>
              <select
                {...register('couponType')}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
              >
                <option value="fixed">Valor fixo (R$)</option>
                <option value="percentage">Percentual (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Valor do desconto {couponType === 'fixed' ? '(R$)' : '(%)'}
              </label>
              <input
                {...register('couponValue', { valueAsNumber: true })}
                type="number"
                step={couponType === 'fixed' ? '1' : '0.1'}
                min="1"
                max={couponType === 'percentage' ? '100' : undefined}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Validade do cupom (dias após o aniversário)</label>
            <input
              {...register('couponValidityDays', { valueAsNumber: true })}
              type="number"
              min="1"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
            />
          </div>

          {/* Preview */}
          <div className="flex items-start gap-2 p-3 bg-pink-50 border border-pink-100 rounded-lg text-sm text-pink-700">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              O cupom gerado terá <strong>{couponPreview}</strong>, válido por{' '}
              <strong>{validDays} dia{validDays !== 1 ? 's' : ''}</strong> a partir do aniversário, uso único e intransferível.
            </span>
          </div>
        </div>

        {/* Mensagem push */}
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem da notificação push</label>
          <textarea
            {...register('pushMessage')}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Enviada para o celular da cliente junto com o código do cupom.
          </p>
        </div>

        {/* Actions */}
        <div className="p-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {(isSubmitting || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar configurações
          </button>
          <button
            type="button"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {runMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Executar agora
          </button>
        </div>
      </form>

      {/* Como funciona */}
      <div className="bg-pink-50 border border-pink-100 rounded-xl p-5">
        <h3 className="font-medium text-pink-800 text-sm mb-3">Como funciona</h3>
        <ol className="space-y-2 text-sm text-pink-700">
          <li className="flex gap-2"><span className="font-bold">1.</span> Todo dia às <strong>{sendHourLabel} (Brasília)</strong> o sistema verifica quem faz aniversário naquele dia.</li>
          <li className="flex gap-2"><span className="font-bold">2.</span> Para cada aniversariante um cupom único é criado com o código <code className="bg-pink-100 px-1 rounded text-xs">ANIV{new Date().getFullYear()}XXXXXX</code>.</li>
          <li className="flex gap-2"><span className="font-bold">3.</span> Uma notificação push é enviada automaticamente para o celular da cliente.</li>
          <li className="flex gap-2"><span className="font-bold">4.</span> O cupom vale por <strong>{validDays} dia{validDays !== 1 ? 's' : ''}</strong>, uso único e intransferível.</li>
          <li className="flex gap-2"><span className="font-bold">5.</span> Cada cliente recebe apenas um cupom por ano — reenvios são bloqueados automaticamente.</li>
          <li className="flex gap-2"><span className="font-bold">6.</span> Só recebem clientes que cadastraram a <strong>data de nascimento</strong> no app.</li>
        </ol>
        <p className="text-xs text-pink-500 mt-3 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Qualquer alteração salva aqui passa a valer no próximo disparo — sem necessidade de reiniciar o servidor.
        </p>
      </div>
    </div>
  );
}
