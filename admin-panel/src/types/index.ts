// ─── Auth ────────────────────────────────────────────────────────────────────

export type AdminRole = 'owner' | 'gerente' | 'recepcao' | 'marketing' | 'financeiro';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalAppointmentsToday: number;
  totalAppointmentsMonth: number;
  pendingPayments: number;
  approvedPayments: number;
  newCustomersMonth: number;
  totalCustomers: number;
  activeCoupons: number;
  revenueMonth: number;
  revenueToday: number;
  birthdaysToday: { id: string; name: string }[];
  upcomingToday: Appointment[];
}

// ─── Services ────────────────────────────────────────────────────────────────

export interface ServiceVariation {
  id: string;
  name: string;
  price: number;
  durationMinutes?: number;
  description?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  category: string;
  categories: string[];
  imageUrl?: string;
  isActive: boolean;
  bookingFeeApplicable: boolean;
  bookingFeeType: 'fixed' | 'percentage';
  bookingFeeValue: number;
  sortOrder: number;
  variations: ServiceVariation[];
}

// ─── Professionals ───────────────────────────────────────────────────────────

export interface Professional {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  specialties: string[];
  isActive: boolean;
  rating: number;
  reviewCount: number;
  trinksEmployeeId?: string;
}

// ─── Customers ───────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isBlocked: boolean;
  canPost: boolean;
  birthDate?: string;
  acceptsMarketing: boolean;
  acceptsPush: boolean;
  internalNotes?: string;
  createdAt: string;
}

// ─── Appointments ────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  userId?: string;
  user?: { name: string; email: string };
  serviceId?: string;
  professionalId?: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'pendente_pagamento' | 'confirmado' | 'cancelado' | 'concluido' | 'nao_compareceu';
  servicePrice: number;
  bookingFee: number;
  remainingAmount: number;
  paymentStatus: 'pendente' | 'aprovado' | 'recusado' | 'reembolsado';
  user_id?: string;
  service_price?: number;
  appointment_date?: string;
  appointment_time?: string;
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  maxUsages?: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  status: 'ativo' | 'expirado' | 'esgotado';
  rules: string[];
  imageUrl?: string;
}

// ─── Benefits ────────────────────────────────────────────────────────────────

export interface Benefit {
  id: string;
  title: string;
  description: string;
  type: 'promocao' | 'evento' | 'novidade' | 'exclusivo';
  imageUrl?: string;
  cta?: string;
  ctaLink?: string;
  validUntil?: string;
  isActive: boolean;
  sortOrder: number;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  amount: number;
  status: 'pendente' | 'aprovado' | 'recusado' | 'reembolsado';
  method?: 'pix' | 'credit_card' | 'debit_card';
  userName?: string;
  createdAt: string;
}

// ─── Admin Notifications ─────────────────────────────────────────────────────

export type AdminNotificationType =
  | 'new_appointment'
  | 'appointment_cancelled'
  | 'payment_approved'
  | 'payment_pending'
  | 'new_feedback'
  | 'new_customer'
  | 'no_show';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Birthday Settings ───────────────────────────────────────────────────────

export interface BirthdaySettings {
  isActive: boolean;
  couponType: 'percentage' | 'fixed';
  couponValue: number;
  couponValidityDays: number;
  pushMessage: string;
  sendHour: number;
}

// ─── Push Campaign ───────────────────────────────────────────────────────────

export interface PushCampaign {
  id: string;
  title: string;
  body: string;
  segment: string;
  type: 'unico' | 'manual' | 'recorrente';
  status: 'rascunho' | 'agendada' | 'enviada' | 'manual' | 'recorrente' | 'cancelada';
  scheduledAt?: string;
  sentAt?: string;
  sentCount: number;
  createdAt?: string;
  // Recurrence
  recurrenceType?: 'weekly' | 'interval';
  recurrenceDays?: number[];
  recurrenceInterval?: number;
  recurrenceHour?: number;
  recurrenceNextSend?: string;
  recurrenceActive?: boolean;
}

// ─── App Settings ────────────────────────────────────────────────────────────

export interface BrandingSettings {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  logoUrl?: string;
  bannerUrl?: string;
  tagline: string;
}

export interface ScheduleSettings {
  bookingFee: number;
  cancelPolicy: string;
  noShowFee: number;
  slotIntervalMinutes: number;
  blockedDates: string[];
  businessHours: Record<string, { open: string; close: string; closed: boolean }>;
}

export interface IntegrationSettings {
  trinksEnabled: boolean;
  mercadoPagoEnabled: boolean;
  googleReviewLink: string;
  pushEnabled: boolean;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export interface Feedback {
  id: string;
  userName: string;
  userEmail?: string;
  rating: number;
  comment: string;
  professionalName?: string;
  serviceName?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  createdAt: string;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface ReviewItem {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  source: 'app' | 'google';
  createdAt: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  breakdown: Record<string, number>;
  recentReviews: ReviewItem[];
}

// ─── Paginated response ──────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
