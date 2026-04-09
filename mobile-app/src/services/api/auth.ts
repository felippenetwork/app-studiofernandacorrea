import { apiClient, USE_MOCK } from './client';
import { AuthTokens, LoginCredentials, RegisterData, UpdateProfileData, User } from '../../types';
import { MOCK_USER } from '../../mocks/data';

// Map snake_case API response to camelCase User
function mapApiUser(apiUser: any): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone ?? undefined,
    avatar: apiUser.avatar_url ?? undefined,
    birthDate: apiUser.birth_date ?? null,
    acceptsMarketing: apiUser.accepts_marketing ?? false,
    acceptsPush: apiUser.accepts_push ?? true,
    isVip: apiUser.is_vip ?? false,
    createdAt: apiUser.created_at,
    updatedAt: apiUser.updated_at,
  };
}

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
    return { user: mapApiUser(data.data.user), tokens: data.data.tokens };
  },

  async register(registerData: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 1000));
      return {
        user: {
          ...MOCK_USER,
          name: registerData.name,
          email: registerData.email,
          birthDate: registerData.birth_date ?? null,
          acceptsMarketing: registerData.accepts_marketing,
          acceptsPush: registerData.accepts_push,
        },
        tokens: { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
      };
    }
    const { data } = await apiClient.post('/auth/register', registerData);
    return { user: mapApiUser(data.data.user), tokens: data.data.tokens };
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
    return mapApiUser(data.data);
  },

  async updateProfile(updates: UpdateProfileData): Promise<User> {
    if (USE_MOCK) {
      return { ...MOCK_USER, ...updates } as User;
    }
    const { data } = await apiClient.patch('/users/me', updates);
    return mapApiUser(data.data);
  },
};
