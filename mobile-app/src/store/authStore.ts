import { create } from 'zustand';
import { User, AuthTokens } from '../types';
import { setAuthToken, registerUnauthorizedHandler } from '../services/api/client';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User, tokens: AuthTokens) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user, tokens) => {
    setAuthToken(tokens.accessToken);
    set({ user, tokens, isAuthenticated: true });
  },

  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),

  logout: () => {
    setAuthToken(null);
    set({ user: null, tokens: null, isAuthenticated: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

// Register 401 handler so the API client can trigger logout without a circular import
registerUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});
