import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentStatus, PaymentStatus, DiscountType } from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatDateShort(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateRelative(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  if (isThisWeek(date)) {
    return format(date, "EEEE", { locale: ptBR });
  }
  return format(date, "dd 'de' MMM", { locale: ptBR });
}

export function formatDateCalendar(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

export function formatTime(timeStr: string): string {
  return timeStr;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatDiscount(type: DiscountType, value: number): string {
  if (type === 'percentage') return `${value}% OFF`;
  return `${formatCurrency(value)} OFF`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    pendente_pagamento: 'Aguardando Pagamento',
    confirmado: 'Confirmado',
    cancelado: 'Cancelado',
    concluido: 'Concluído',
    nao_compareceu: 'Não Compareceu',
  };
  return labels[status];
}

export function appointmentStatusColor(status: AppointmentStatus): string {
  const colors: Record<AppointmentStatus, string> = {
    pendente_pagamento: '#D4A84B',
    confirmado: '#7DB87D',
    cancelado: '#D47070',
    concluido: '#C9A4A0',
    nao_compareceu: '#ABABAB',
  };
  return colors[status];
}

export function paymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    recusado: 'Recusado',
    reembolsado: 'Reembolsado',
  };
  return labels[status];
}

export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
