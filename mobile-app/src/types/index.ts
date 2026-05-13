// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  birthDate?: string | null;
  acceptsMarketing: boolean;
  acceptsPush: boolean;
  isVip?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Services ────────────────────────────────────────────────────────────────

export type ServiceCategory =
  | 'cabelo'
  | 'unhas'
  | 'estetica'
  | 'maquiagem'
  | 'sobrancelha'
  | 'depilacao'
  | 'outros';

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
  description: string;
  price: number;
  durationMinutes: number;
  category: ServiceCategory;
  imageUrl?: string;
  isActive: boolean;
  bookingFeeType?: 'fixed' | 'percentage';
  bookingFeeValue?: number;
  variations?: ServiceVariation[];
}

// ─── Professionals ───────────────────────────────────────────────────────────

export interface Professional {
  id: string;
  name: string;
  avatarUrl?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  bio?: string;
  isActive: boolean;
}

// ─── Appointments ────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'pendente_pagamento'
  | 'confirmado'
  | 'cancelado'
  | 'concluido'
  | 'nao_compareceu';

export type PaymentStatus =
  | 'pendente'
  | 'aprovado'
  | 'recusado'
  | 'reembolsado';

export interface Appointment {
  id: string;
  userId: string;
  trinksAppointmentId?: string;
  service: Service;
  professional: Professional;
  appointmentDate: string; // ISO date: "2025-03-20"
  appointmentTime: string; // "14:30"
  status: AppointmentStatus;
  servicePrice: number;
  bookingFee: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentType = 'booking_fee' | 'full_payment';
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card';

export interface Payment {
  id: string;
  userId: string;
  appointmentId: string;
  amount: number;
  type: PaymentType;
  method?: PaymentMethod;
  status: PaymentStatus;
  externalPaymentId?: string;
  createdAt: string;
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

export type DiscountType = 'percentage' | 'fixed';
export type CouponStatus = 'ativo' | 'expirado' | 'esgotado';

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number;
  maxUsages?: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  status: CouponStatus;
  rules: string[];
  imageUrl?: string;
  applicableServices?: string[];
}

export interface CouponRedemption {
  id: string;
  userId: string;
  couponId: string;
  appointmentId?: string;
  redeemedAt: string;
}

// ─── Benefits ────────────────────────────────────────────────────────────────

export type BenefitType = 'promocao' | 'evento' | 'novidade' | 'exclusivo';

export interface Benefit {
  id: string;
  title: string;
  description: string;
  type: BenefitType;
  imageUrl?: string;
  cta?: string;
  ctaLink?: string;
  validUntil?: string;
  isActive: boolean;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'agendamento_confirmado'
  | 'lembrete_horario'
  | 'novo_cupom'
  | 'promocao'
  | 'aviso';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ─── Booking Flow ────────────────────────────────────────────────────────────

export interface BookingFlow {
  selectedService: Service | null;
  selectedVariation: ServiceVariation | null;
  selectedProfessional: Professional | null;
  selectedDate: string | null; // ISO "2025-03-20"
  selectedTime: string | null; // "14:30"
  selectedCoupon: Coupon | null;
}

// ─── Navigation Types ────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  EmailVerification: { email: string };
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Booking: undefined;
  MyAppointments: undefined;
  Coupons: undefined;
  Profile: undefined;
};

export type BookingStackParamList = {
  Services: undefined;
  ServiceVariation: undefined;
  ProfessionalSelection: undefined;
  Schedule: undefined;
  TimeSelection: undefined;
  AppointmentSummary: undefined;
  Payment: undefined;
};

export type CouponsStackParamList = {
  CouponsList: undefined;
  CouponDetails: { couponId: string };
};

export type AppointmentsStackParamList = {
  AppointmentsList: undefined;
  AppointmentDetail: { appointmentId: string };
  AppointmentReview: { appointmentId: string; serviceName: string };
};

export interface Review {
  id: string;
  appointmentId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// ─── Feed / Posts ─────────────────────────────────────────────────────────────

export type MediaType = 'photo' | 'video' | 'boomerang';

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  text: string;
  mediaUrl: string;
  mediaType: MediaType;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  text: string;
  createdAt: string;
}

export type HomeStackParamList = {
  HomeMain: undefined;
  PostComposer: { capturedUri?: string; capturedType?: MediaType } | undefined;
  BoomerangCamera: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Benefits: undefined;
  Notifications: undefined;
  EditProfile: undefined;
};

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  birth_date?: string | null;
  accepts_marketing: boolean;
  accepts_push: boolean;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  birth_date?: string | null;
  accepts_marketing?: boolean;
  accepts_push?: boolean;
}
