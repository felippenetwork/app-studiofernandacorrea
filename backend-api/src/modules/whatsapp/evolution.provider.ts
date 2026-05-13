import { WppConfig } from './whatsapp.service';

export async function evolutionGetStatus(cfg: WppConfig): Promise<{ connected: boolean; qrcode?: string; state?: string }> {
  if (!cfg.apiUrl || !cfg.instanceName) return { connected: false, state: 'not_configured' };

  const data = await evolutionFetch(cfg, `/instance/connectionState/${cfg.instanceName}`);
  if (!data) return { connected: false, state: 'unreachable' };

  const state: string = data?.instance?.state ?? data?.state ?? '';
  if (state === 'open') return { connected: true, state };

  const qrData = await evolutionFetch(cfg, `/instance/connect/${cfg.instanceName}`);
  const qrcode: string | undefined = qrData?.base64 ?? qrData?.qrcode?.base64 ?? undefined;
  return { connected: false, state, qrcode };
}

export async function evolutionSend(cfg: WppConfig, number: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const result = await evolutionFetch(cfg, `/message/sendText/${cfg.instanceName}`, 'POST', {
    number,
    textMessage: { text },
  });
  const ok = !!result?.key?.id || !!result?.message?.conversation;
  return { ok, error: ok ? undefined : 'API error' };
}

async function evolutionFetch(cfg: WppConfig, path: string, method = 'GET', body?: any): Promise<any> {
  const res = await fetch(`${cfg.apiUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', apikey: cfg.apiKey },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  if (!res) return null;
  return res.ok ? res.json().catch(() => null) : null;
}
