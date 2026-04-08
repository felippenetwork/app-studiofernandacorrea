import axios, { AxiosError } from 'axios';

// Set EXPO_PUBLIC_API_URL in your .env file, e.g.:
//   EXPO_PUBLIC_API_URL=http://192.168.0.10:3000/api   (local network for Expo Go)
//   EXPO_PUBLIC_API_URL=https://api.studiofernandacorrea.com.br/api  (production)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

// When true, all services use local mock data (no backend needed)
// Switch to false when backend is running
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Injects the Bearer token into every request.
 * Called by authStore.setUser() so there are no circular imports.
 */
export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

/**
 * Callback registered by the auth store to trigger logout on 401.
 * Avoids circular imports between client ↔ authStore.
 */
let _onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler;
}

// Response interceptor: handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && _onUnauthorized) {
      console.warn('[API] 401 Unauthorized — triggering logout');
      _onUnauthorized();
    }
    return Promise.reject(error);
  }
);
