import { apiClient } from './client';
import { AuthTokens, LoginCredentials, RegisterData, User } from '../../types';
import { MOCK_USER } from '../../mocks/data';

// Toggle: false = use real API, true = use mocks
const USE_MOCK = true;

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 1000));
      return {
        user: MOCK_USER,
        tokens: { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
      };
    }
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
  },

  async register(registerData: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 1000));
      return {
        user: { ...MOCK_USER, name: registerData.name, email: registerData.email },
        tokens: { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
      };
    }
    const { data } = await apiClient.post('/auth/register', registerData);
    return data;
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const { data } = await apiClient.post('/auth/refresh', { refreshToken });
    return data;
  },

  async logout(): Promise<void> {
    if (!USE_MOCK) {
      await apiClient.post('/auth/logout');
    }
  },
};
