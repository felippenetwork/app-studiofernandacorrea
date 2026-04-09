import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(date: string): string {
  try { return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR }); }
  catch { return date; }
}

export function formatDateTime(date: string): string {
  try { return format(parseISO(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
  catch { return date; }
}

export function formatRelative(date: string): string {
  try { return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR }); }
  catch { return date; }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
