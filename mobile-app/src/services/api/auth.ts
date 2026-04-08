import { apiClient, USE_MOCK } from './client';
import { AuthTokens, LoginCredentials, RegisterData, User } from '../../types';
import { MOCK_USER } from '../../mocks/data';

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
    return data.data;
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
    return data.data;
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const { data } = await apiClient.post('/auth/refresh', { refreshToken });
    return data.data;
  },

  async logout(): Promise<void> {
    if (!USE_MOCK) {
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // Ignore logout errors — clear local state regardless
      }
    }
  },

  async getMe(): Promise<User> {
    if (USE_MOCK) {
      return MOCK_USER;
    }
    const { data } = await apiClient.get('/users/me');
    return data.data;
  },
};
