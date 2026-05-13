import axios, { AxiosInstance, AxiosError } from 'axios';

export interface RetentionClient {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  lastVisit: string;
  daysAway: number;
  totalVisits: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach admin token from localStorage
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/admin/auth/login', { email, password }).then((r) => r.data.data),
  me: () =>
    apiClient.get('/admin/auth/me').then((r) => r.data.data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  stats: () => apiClient.get('/admin/dashboard/stats').then((r) => r.data.data),
};

// ─── Services ────────────────────────────────────────────────────────────────

export const servicesApi = {
  list: () => apiClient.get('/admin/services').then((r) => r.data.data),
  create: (data: any) => apiClient.post('/admin/services', data).then((r) => r.data.data),
  update: (id: string, data: any) => apiClient.put(`/admin/services/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => apiClient.delete(`/admin/services/${id}`),
  reorder: (items: { id: string; sortOrder: number }[]) =>
    apiClient.patch('/admin/services/reorder', { items }).then((r) => r.data),
};

// ─── Professionals ────────────────────────────────────────────────────────────

export const professionalsApi = {
  list: () => apiClient.get('/admin/professionals').then((r) => r.data.data),
  create: (data: any) => apiClient.post('/admin/professionals', data).then((r) => r.data.data),
  update: (id: string, data: any) => apiClient.put(`/admin/professionals/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => apiClient.delete(`/admin/professionals/${id}`),
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const customersApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/customers', { params }).then((r) => r.data.data),
  get: (id: string) => apiClient.get(`/admin/customers/${id}`).then((r) => r.data.data),
  create: (data: any) => apiClient.post('/admin/customers', data).then((r) => r.data.data),
  update: (id: string, data: any) => apiClient.put(`/admin/customers/${id}`, data).then((r) => r.data.data),
  retention: (minDays?: number) =>
    apiClient.get('/admin/customers/retention', { params: { minDays } }).then((r) => r.data.data as RetentionClient[]),
};

// ─── Coupons ──────────────────────────────────────────────────────────────────

export const couponsApi = {
  list: () => apiClient.get('/admin/coupons').then((r) => r.data.data),
  create: (data: any) => apiClient.post('/admin/coupons', data).then((r) => r.data.data),
  update: (id: string, data: any) => apiClient.put(`/admin/coupons/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => apiClient.delete(`/admin/coupons/${id}`),
};

// ─── Benefits ─────────────────────────────────────────────────────────────────

export const benefitsApi = {
  list: () => apiClient.get('/admin/benefits').then((r) => r.data.data),
  create: (data: any) => apiClient.post('/admin/benefits', data).then((r) => r.data.data),
  update: (id: string, data: any) => apiClient.put(`/admin/benefits/${id}`, data).then((r) => r.data.data),
  remove: (id: string) => apiClient.delete(`/admin/benefits/${id}`),
};

// ─── Appointments ─────────────────────────────────────────────────────────────

export const appointmentsAdminApi = {
  list: (params?: { date?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/appointments', { params }).then((r) => r.data.data),
  create: (data: any) => apiClient.post('/admin/appointments', data).then((r) => r.data.data),
  availableSlots: (professionalId: string, serviceId: string, date: string) =>
    apiClient.get('/admin/appointments/available-slots', { params: { professionalId, serviceId, date } }).then((r) => r.data.data as { time: string; available: boolean }[]),
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentsAdminApi = {
  list: (params?: { status?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/payments', { params }).then((r) => r.data.data),
};

// ─── Admin Notifications ──────────────────────────────────────────────────────

export const adminNotificationsApi = {
  list: () => apiClient.get('/admin/notifications').then((r) => r.data.data),
  markRead: (id: string) => apiClient.patch(`/admin/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/admin/notifications/read-all'),
};

// ─── Birthday ─────────────────────────────────────────────────────────────────

export const birthdayApi = {
  getSettings: () => apiClient.get('/admin/birthday/settings').then((r) => r.data.data),
  updateSettings: (data: any) => apiClient.put('/admin/birthday/settings', data).then((r) => r.data.data),
  runNow: () => apiClient.post('/admin/birthday/run-now').then((r) => r.data),
};

// ─── Push Campaigns ───────────────────────────────────────────────────────────

export const pushCampaignsApi = {
  list: () => apiClient.get('/admin/push-campaigns').then((r) => r.data.data),
  create: (data: any) => apiClient.post('/admin/push-campaigns', data).then((r) => r.data.data),
  send: (id: string) => apiClient.post(`/admin/push-campaigns/${id}/send`).then((r) => r.data),
};

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const feedbackApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/feedback', { params }).then((r) => r.data.data),
  updateStatus: (id: string, status: 'aprovado' | 'rejeitado') =>
    apiClient.patch(`/admin/feedback/${id}/status`, { status }).then((r) => r.data),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviewsApi = {
  summary: () => apiClient.get('/admin/reviews/summary').then((r) => r.data.data),
};

// ─── App Settings ─────────────────────────────────────────────────────────────

export const settingsApi = {
  get: (key: string) => apiClient.get(`/admin/settings/${key}`).then((r) => r.data.data),
  set: (key: string, value: any) => apiClient.put(`/admin/settings/${key}`, { value }).then((r) => r.data.data),
};

// ─── Admin Users ──────────────────────────────────────────────────────────────

export const adminUsersApi = {
  list: () => apiClient.get('/admin/users').then((r) => r.data.data),
  create: (data: any) => apiClient.post('/admin/users', data).then((r) => r.data.data),
  update: (id: string, data: any) => apiClient.put(`/admin/users/${id}`, data).then((r) => r.data.data),
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/audit-logs', { params }).then((r) => r.data.data),
};

// ─── Appointments (status update) ─────────────────────────────────────────────

export const appointmentStatusApi = {
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/admin/appointments/${id}/status`, { status, notes }).then((r) => r.data.data),
};

// ─── Schedules ────────────────────────────────────────────────────────────────

export const schedulesApi = {
  getAll: () => apiClient.get('/admin/schedules').then((r) => r.data.data),
  getByProfessional: (professionalId: string) =>
    apiClient.get(`/admin/schedules/${professionalId}`).then((r) => r.data.data),
  setDay: (professionalId: string, dayOfWeek: number, data: { startTime: string; endTime: string; isActive: boolean }) =>
    apiClient.put(`/admin/schedules/${professionalId}/day/${dayOfWeek}`, data).then((r) => r.data.data),
  getBlocks: (professionalId: string, params?: { from?: string; to?: string }) =>
    apiClient.get(`/admin/schedules/${professionalId}/blocks`, { params }).then((r) => r.data.data),
  createBlock: (professionalId: string, data: { blockDate: string; startTime?: string; endTime?: string; reason?: string }) =>
    apiClient.post(`/admin/schedules/${professionalId}/blocks`, data).then((r) => r.data.data),
  deleteBlock: (blockId: string) =>
    apiClient.delete(`/admin/schedules/blocks/${blockId}`).then((r) => r.data),
  getSlots: (professionalId: string, serviceId: string, date: string) =>
    apiClient.get(`/admin/schedules/${professionalId}/slots`, { params: { serviceId, date } }).then((r) => r.data.data),
};

// ─── Commissions ──────────────────────────────────────────────────────────────

export const commissionsApi = {
  getRates: (professionalId?: string) =>
    apiClient.get('/admin/commissions/rates', { params: { professionalId } }).then((r) => r.data.data),
  setRate: (data: { professionalId: string; serviceId: string; percentage: number }) =>
    apiClient.put('/admin/commissions/rates', data).then((r) => r.data.data),
  deleteRate: (data: { professionalId: string; serviceId: string }) =>
    apiClient.delete('/admin/commissions/rates', { data }).then((r) => r.data),
  getSummary: (params?: { from?: string; to?: string }) =>
    apiClient.get('/admin/commissions/summary', { params }).then((r) => r.data.data),
  getRecords: (params?: { professionalId?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/commissions/records', { params }).then((r) => r.data.data),
  pay: (ids: string[], notes?: string) =>
    apiClient.post('/admin/commissions/records/pay', { ids, notes }).then((r) => r.data),
};

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
export const whatsappApi = {
  getConfig:    () => apiClient.get('/admin/whatsapp/config').then((r) => r.data.data as WppConfig | null),
  saveConfig:   (d: { provider: string; apiUrl?: string; apiKey?: string; instanceName?: string }) =>
    apiClient.post('/admin/whatsapp/config', d).then((r) => r.data),
  setActive:    (active: boolean) => apiClient.patch('/admin/whatsapp/config/active', { active }).then((r) => r.data),
  getStatus:    () => apiClient.get('/admin/whatsapp/status').then((r) => r.data.data as { connected: boolean; qrcode?: string; state?: string }),
  connect:      () => apiClient.post('/admin/whatsapp/connect').then((r) => r.data),
  disconnect:   () => apiClient.post('/admin/whatsapp/disconnect').then((r) => r.data),
  getTemplates: () => apiClient.get('/admin/whatsapp/templates').then((r) => r.data.data as WppTemplate[]),
  updateTemplate: (id: string, d: { message?: string; isActive?: boolean }) =>
    apiClient.patch(`/admin/whatsapp/templates/${id}`, d).then((r) => r.data),
  send:  (d: { phone: string; message: string; recipientName?: string; recipientId?: string; trigger?: string }) =>
    apiClient.post('/admin/whatsapp/send', d).then((r) => r.data),
  getLog: (limit?: number) => apiClient.get('/admin/whatsapp/log', { params: { limit } }).then((r) => r.data.data as WppLog[]),
};

export interface WppConfig {
  id?: string; provider: string; apiUrl: string; apiKey: string; instanceName: string; isActive: boolean;
}
export interface WppTemplate {
  id: string; trigger: string; name: string; message: string; isActive: boolean; delayDays: number;
}
export interface WppLog {
  id: string; trigger?: string; recipientName?: string; phone: string;
  message: string; status: string; error?: string; sentAt: string;
}
