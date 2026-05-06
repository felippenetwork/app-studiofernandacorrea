import { Request } from 'express';

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  password_hash: string;
  birth_date: string | null;
  accepts_marketing: boolean;
  accepts_push: boolean;
  is_vip: boolean;
  is_blocked: boolean;
  internal_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbService {
  id: string;
  trinks_service_id: string | null;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbProfessional {
  id: string;
  trinks_employee_id: string | null;
  name: string;
  avatar_url: string | null;
  specialties: string[];
  bio: string | null;
  rating: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus =
  | 'pendente_pagamento'
  | 'confirmado'
  | 'cancelado'
  | 'concluido'
  | 'nao_compareceu';

export type PaymentStatus = 'pendente' | 'aprovado' | 'recusado' | 'reembolsado';
export type PaymentType = 'booking_fee' | 'full_payment';
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card';

export interface DbAppointment {
  id: string;
  user_id: string;
  trinks_appointment_id: string | null;
  service_id: string;
  professional_id: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  service_price: number;
  booking_fee: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  payment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPayment {
  id: string;
  user_id: string;
  appointment_id: string;
  amount: number;
  type: PaymentType;
  method: PaymentMethod | null;
  status: PaymentStatus;
  external_payment_id: string | null;
  mp_preference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DbCoupon {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number | null;
  max_usages: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string;
  status: 'ativo' | 'expirado' | 'esgotado';
  rules: string[];
  image_url: string | null;
  applicable_services: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DbBenefit {
  id: string;
  title: string;
  description: string;
  type: 'promocao' | 'evento' | 'novidade' | 'exclusivo';
  image_url: string | null;
  cta: string | null;
  cta_link: string | null;
  valid_until: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbPushToken {
  id: string;
  user_id: string;
  token: string;
  provider: 'expo' | 'fcm' | 'apns';
  platform: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Express Extensions ───────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// ─── Business Logic Types ─────────────────────────────────────────────────────

export const BOOKING_FEE = 40;

export interface CreateAppointmentInput {
  serviceId: string;
  professionalId: string;
  appointmentDate: string;
  appointmentTime: string;
  variationId?: string;
  notes?: string;
}

export interface CreatePaymentInput {
  appointmentId: string;
  method: PaymentMethod;
}
