import {
  User,
  Service,
  Professional,
  Appointment,
  Coupon,
  Benefit,
  AppNotification,
} from '../types';

// All mock data cleared — app uses real API data from backend
// These empty exports keep imports valid in any remaining mock-mode codepaths

export const MOCK_USER: User = {
  id: '',
  name: '',
  email: '',
  acceptsMarketing: false,
  acceptsPush: true,
  createdAt: '',
  updatedAt: '',
};

export const MOCK_SERVICES: Service[] = [];

export const MOCK_PROFESSIONALS: Professional[] = [];

export const MOCK_APPOINTMENTS: Appointment[] = [];

export const MOCK_COUPONS: Coupon[] = [];

export const MOCK_BENEFITS: Benefit[] = [];

export const MOCK_NOTIFICATIONS: AppNotification[] = [];

export const MOCK_TIME_SLOTS: { time: string; available: boolean }[] = [];

export const BOOKING_FEE = 40;
