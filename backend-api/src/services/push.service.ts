import axios from 'axios';
import { hasSupabase } from '../config/env';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const pushService = {
  /**
   * Sends a push notification to all active devices of a user.
   * Safe to call even if the user has no tokens — will be a no-op.
   */
  async sendToUser(userId: string, message: PushMessage): Promise<void> {
    const tokens = await getActiveTokens(userId);
    if (tokens.length === 0) {
      console.log(`[push] No active tokens for user ${userId} — skipping.`);
      return;
    }
    const messages = tokens.map((token) => ({ to: token, ...message }));
    await sendBatch(messages);
  },

  // ─── Pre-built notification templates ────────────────────────────────────

  async appointmentConfirmed(
    userId: string,
    serviceName: string,
    date: string,
    time: string
  ): Promise<void> {
    await pushService.sendToUser(userId, {
      title: '✓ Agendamento confirmado!',
      body: `${serviceName} confirmado para ${formatDate(date)} às ${time}.`,
      data: { type: 'agendamento_confirmado' },
      sound: 'default',
    });
  },

  async appointmentReminder(
    userId: string,
    serviceName: string,
    date: string,
    time: string
  ): Promise<void> {
    await pushService.sendToUser(userId, {
      title: '⏰ Lembrete de horário',
      body: `Seu ${serviceName} é amanhã às ${time}. Até lá!`,
      data: { type: 'lembrete_horario', date, time },
      sound: 'default',
    });
  },

  async appointmentCancelled(userId: string, serviceName: string): Promise<void> {
    await pushService.sendToUser(userId, {
      title: 'Agendamento cancelado',
      body: `Seu ${serviceName} foi cancelado.`,
      data: { type: 'agendamento_cancelado' },
      sound: 'default',
    });
  },

  async newCoupon(userId: string, couponTitle: string, code: string): Promise<void> {
    await pushService.sendToUser(userId, {
      title: '🎁 Novo cupom disponível!',
      body: `${couponTitle} — use o código ${code}.`,
      data: { type: 'novo_cupom' },
      sound: 'default',
    });
  },

  /**
   * Sends a push notification to a list of raw token strings.
   * Used by push campaigns for bulk delivery.
   */
  async sendBulk(tokens: string[], message: PushMessage): Promise<{ sent: number; failed: number }> {
    if (tokens.length === 0) return { sent: 0, failed: 0 };
    const messages = tokens.map((token) => ({ to: token, ...message, sound: message.sound ?? 'default' as const }));
    let sent = 0;
    let failed = 0;
    const chunks = chunk(messages, 100);
    for (const batch of chunks) {
      try {
        const response = await axios.post(EXPO_PUSH_URL, batch, {
          headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
          timeout: 10000,
        });
        const results: any[] = response.data?.data ?? [];
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === 'ok') {
            sent++;
          } else {
            failed++;
            if (result.details?.error === 'DeviceNotRegistered') {
              await deactivateToken(batch[i].to).catch(() => {});
            }
          }
        }
        // If Expo doesn't return per-item results, count as all sent
        if (results.length === 0) sent += batch.length;
      } catch (err) {
        console.error('[push] Bulk send batch failed:', (err as Error).message);
        failed += batch.length;
      }
    }
    return { sent, failed };
  },
};

// ─── Internals ────────────────────────────────────────────────────────────────

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

async function sendBatch(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Split into chunks of 100 (Expo limit)
  const chunks = chunk(messages, 100);

  for (const batch of chunks) {
    try {
      const response = await axios.post(EXPO_PUSH_URL, batch, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const results: any[] = response.data?.data ?? [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'error') {
          console.warn(`[push] Delivery error for token ${batch[i].to}:`, result.message);
          if (result.details?.error === 'DeviceNotRegistered') {
            await deactivateToken(batch[i].to).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('[push] Batch send failed:', (err as Error).message);
      // Non-fatal — user still gets the in-app notification
    }
  }
}

async function getActiveTokens(userId: string): Promise<string[]> {
  if (!hasSupabase) return [];

  try {
    const { supabase } = await import('../config/supabase');
    const { data } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('is_active', true);
    return (data ?? []).map((row: { token: string }) => row.token);
  } catch (err) {
    console.warn('[push] Failed to fetch tokens:', (err as Error).message);
    return [];
  }
}

async function deactivateToken(token: string): Promise<void> {
  if (!hasSupabase) return;
  const { supabase } = await import('../config/supabase');
  await supabase.from('push_tokens').update({ is_active: false }).eq('token', token);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function formatDate(isoDate: string): string {
  try {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return isoDate;
  }
}
