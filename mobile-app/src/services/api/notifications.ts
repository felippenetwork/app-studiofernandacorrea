import * as ExpoNotifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient, USE_MOCK } from './client';

export const pushNotificationsService = {
  async registerPushToken(): Promise<string | null> {
    try {
      const { status: existing } = await ExpoNotifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await ExpoNotifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[push] Permission not granted — skipping token registration.');
        return null;
      }

      // SDK 50+ requires projectId from EAS. Falls back gracefully if not configured.
      const projectId =
        (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
        (Constants.easConfig?.projectId as string | undefined);

      if (!projectId) {
        console.warn('[push] No EAS projectId found. Run `eas init` to enable push notifications.');
        return null;
      }

      const tokenData = await ExpoNotifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      if (!USE_MOCK) {
        await apiClient.post('/notifications/register-token', {
          token,
          provider: 'expo',
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        });
      }

      console.log('[push] Token registered:', token.slice(0, 30) + '…');
      return token;
    } catch (err) {
      console.warn('[push] Failed to register push token:', err);
      return null;
    }
  },

  async deregisterPushToken(token: string): Promise<void> {
    if (USE_MOCK) return;
    try {
      await apiClient.delete('/notifications/register-token', { data: { token } });
    } catch {
      // Non-fatal — token will expire naturally
    }
  },
};
