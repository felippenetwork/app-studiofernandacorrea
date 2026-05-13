import { createClient } from '@supabase/supabase-js';
import { env, hasSupabase } from '../../config/env';
import QRCode from 'qrcode';

const supabase = hasSupabase
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!)
  : null as any;

type ConnectionState = 'disconnected' | 'connecting' | 'qr_ready' | 'connected';

interface BaileysState {
  state: ConnectionState;
  qrcode?: string;   // base64 data URL
  error?: string;
}

let _sock: any = null;
let _status: BaileysState = { state: 'disconnected' };
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function getBaileysStatus(): BaileysState {
  return { ..._status };
}

function makeSilentLogger(): any {
  const logger: any = {
    level: 'silent',
    trace: () => {},
    debug: () => {},
    info:  () => {},
    warn:  () => {},
    error: () => {},
    fatal: () => {},
    child: () => makeSilentLogger(),
  };
  return logger;
}

export async function connectBaileys(): Promise<void> {
  if (_sock) {
    _sock.end?.();
    _sock = null;
  }
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }

  _status = { state: 'connecting' };

  try {
    const {
      default: makeWASocket,
      DisconnectReason,
      fetchLatestBaileysVersion,
    } = await import('@whiskeysockets/baileys') as any;

    const authState = await loadAuthState();

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: authState.state,
      printQRInTerminal: false,
      logger: makeSilentLogger(),
    });

    _sock = sock;

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const dataUrl = await QRCode.toDataURL(qr);
          _status = { state: 'qr_ready', qrcode: dataUrl };
        } catch {
          _status = { state: 'qr_ready', qrcode: qr };
        }
      }

      if (connection === 'open') {
        _status = { state: 'connected' };
      }

      if (connection === 'close') {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;

        if (loggedOut) {
          await clearSessionData();
          _sock = null;
          _status = { state: 'disconnected', error: 'Desconectado (logout). Conecte novamente.' };
        } else {
          _sock = null;
          _status = { state: 'disconnected', error: 'Conexão perdida. Reconectando...' };
          _reconnectTimer = setTimeout(() => connectBaileys(), 5_000);
        }
      }
    });

    sock.ev.on('creds.update', async () => {
      await authState.saveCreds();
    });

  } catch (err: any) {
    _sock = null;
    _status = { state: 'disconnected', error: err.message };
  }
}

export async function disconnectBaileys(): Promise<void> {
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
  if (_sock) {
    try { await _sock.logout(); } catch { /* ignore */ }
    _sock = null;
  }
  await clearSessionData();
  _status = { state: 'disconnected' };
}

export async function sendBaileysMessage(phone: string, text: string): Promise<{ ok: boolean; error?: string }> {
  if (!_sock || _status.state !== 'connected') {
    return { ok: false, error: 'Baileys não conectado' };
  }
  try {
    const jid = formatJid(phone);
    await _sock.sendMessage(jid, { text });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

function formatJid(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `${withCountry}@s.whatsapp.net`;
}

// ─── Auth state (Supabase JSONB persistence) ──────────────────────────────────

async function loadSessionData(): Promise<any> {
  if (!hasSupabase) return null;
  const { data } = await supabase
    .from('whatsapp_config')
    .select('session_data')
    .limit(1)
    .maybeSingle();
  return data?.session_data ?? null;
}

async function saveSessionData(data: any): Promise<void> {
  if (!hasSupabase) return;
  const { data: existing } = await supabase.from('whatsapp_config').select('id').limit(1).maybeSingle();
  if (existing?.id) {
    await supabase.from('whatsapp_config').update({ session_data: data, updated_at: new Date().toISOString() }).eq('id', existing.id);
  } else {
    await supabase.from('whatsapp_config').insert({ provider: 'baileys', session_data: data });
  }
}

async function clearSessionData(): Promise<void> {
  if (!hasSupabase) return;
  const { data: existing } = await supabase.from('whatsapp_config').select('id').limit(1).maybeSingle();
  if (existing?.id) {
    await supabase.from('whatsapp_config').update({ session_data: null, updated_at: new Date().toISOString() }).eq('id', existing.id);
  }
}

async function loadAuthState() {
  const { initAuthCreds, BufferJSON, proto } = await import('@whiskeysockets/baileys') as any;

  const saved = await loadSessionData();
  let creds = saved?.creds ? JSON.parse(JSON.stringify(saved.creds), BufferJSON.reviver) : initAuthCreds();

  const keys: Record<string, any> = {};
  if (saved?.keys) {
    for (const [type, typeData] of Object.entries(saved.keys as Record<string, any>)) {
      keys[type] = {};
      for (const [id, val] of Object.entries(typeData as Record<string, any>)) {
        keys[type][id] = JSON.parse(JSON.stringify(val), BufferJSON.reviver);
      }
    }
  }

  const state = {
    creds,
    keys: {
      get: (type: string, ids: string[]) => {
        const data: Record<string, any> = {};
        for (const id of ids) {
          const val = keys[type]?.[id];
          if (val) data[id] = val;
        }
        return data;
      },
      set: async (data: Record<string, Record<string, any>>) => {
        for (const [type, typeData] of Object.entries(data)) {
          if (!keys[type]) keys[type] = {};
          for (const [id, val] of Object.entries(typeData)) {
            if (val) keys[type][id] = val;
            else delete keys[type][id];
          }
        }
        await persistState();
      },
    },
  };

  async function persistState() {
    const payload = {
      creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
      keys:  JSON.parse(JSON.stringify(keys, BufferJSON.replacer)),
    };
    await saveSessionData(payload);
  }

  const saveCreds = async () => {
    await persistState();
  };

  return { state, saveCreds };
}
