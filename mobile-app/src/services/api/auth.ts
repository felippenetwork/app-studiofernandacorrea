import { apiClient, USE_MOCK } from './client';
import { AuthTokens, LoginCredentials, RegisterData, UpdateProfileData, User } from '../../types';

function parseBool(value: unknown, fallback: boolean): boolean {
  if (value === null || value === undefined) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return Boolean(value);
}

function mapApiUser(apiUser: any): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone ?? undefined,
    avatar: apiUser.avatar_url ?? undefined,
    birthDate: apiUser.birth_date ?? null,
    acceptsMarketing: parseBool(apiUser.accepts_marketing, false),
    acceptsPush: parseBool(apiUser.accepts_push, true),
    isVip: parseBool(apiUser.is_vip, false),
    createdAt: apiUser.created_at,
    updatedAt: apiUser.updated_at,
  };
}

type RegisterResult =
  | { emailVerificationRequired: true; email: string }
  | { emailVerificationRequired: false; user: User; tokens: AuthTokens };

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 800));
      throw new Error('Modo mock desativado. Configure o backend.');
    }
    const { data } = await apiClient.post('/auth/login', credentials);
    return { user: mapApiUser(data.data.user), tokens: data.data.tokens };
  },

  async register(registerData: RegisterData): Promise<RegisterResult> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 800));
      throw new Error('Modo mock desativado. Configure o backend.');
    }
    const { data } = await apiClient.post('/auth/register', registerData);
    const payload = data.data;

    if (payload.emailVerificationRequired) {
      return { emailVerificationRequired: true, email: payload.email };
    }

    return {
      emailVerificationRequired: false,
      user: mapApiUser(payload.user),
      tokens: payload.tokens,
    };
  },

  async resendVerification(email: string): Promise<void> {
    await apiClient.post('/auth/resend-verification', { email });
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
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
        // Ignore — clear local state regardless
      }
    }
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get('/users/me');
    return mapApiUser(data.data);
  },

  async updateProfile(updates: UpdateProfileData): Promise<User> {
    const { data } = await apiClient.patch('/users/me', updates);
    return mapApiUser(data.data);
  },
};
