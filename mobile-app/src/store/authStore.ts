import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthTokens } from '../types';
import { setAuthToken, registerUnauthorizedHandler } from '../services/api/client';
import { pushNotificationsService } from '../services/api/notifications';

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user, tokens) => {
        setAuthToken(tokens.accessToken);
        set({ user, tokens, isAuthenticated: true });
        // Register device for push notifications after every login/rehydrate
        pushNotificationsService.registerPushToken().catch(console.warn);
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
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Restore API token header when the store rehydrates from AsyncStorage
      onRehydrateStorage: () => (state) => {
        if (state?.tokens?.accessToken) {
          setAuthToken(state.tokens.accessToken);
        }
      },
    }
  )
);

// Register 401 handler so the API client can trigger logout without a circular import
registerUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});
