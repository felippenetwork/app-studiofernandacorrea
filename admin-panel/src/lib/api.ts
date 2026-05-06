import axios, { AxiosInstance, AxiosError } from 'axios';

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
