import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient, USE_MOCK } from './client';

/**
 * Requests notification permissions and registers the Expo push token
 * with the backend so the server can send push notifications.
 */
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

      const tokenData = await ExpoNotifications.getExpoPushTokenAsync();
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
