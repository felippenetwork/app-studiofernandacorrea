import axios, { AxiosError } from 'axios';
import { env } from '../../config/env';

const BASE_URL = env.GETNET_ENV === 'production'
  ? 'https://api.getnet.com.br'
  : 'https://api-homologacao.getnet.com.br';

interface CachedToken {
  access_token: string;
  expires_at: number;
}

let _cache: CachedToken | null = null;

async function getAccessToken(): Promise<string> {
  if (_cache && Date.now() < _cache.expires_at - 60_000) {
    return _cache.access_token;
  }

  const credentials = Buffer.from(
    `${env.GETNET_CLIENT_ID}:${env.GETNET_CLIENT_SECRET}`
  ).toString('base64');

  const { data } = await axios.post(
    `${BASE_URL}/v1/token`,
    'scope=oob&grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  _cache = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return _cache.access_token;
}

function buildHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    seller_id: env.GETNET_SELLER_ID!,
    'Content-Type': 'application/json',
  };
}

export async function getnetPost<T>(path: string, body: unknown): Promise<T> {
  try {
    const token = await getAccessToken();
    const { data } = await axios.post<T>(`${BASE_URL}${path}`, body, {
      headers: buildHeaders(token),
    });
    return data;
  } catch (err) {
    const e = err as AxiosError<{ message?: string; description?: string }>;
    const msg =
      e.response?.data?.message ??
      e.response?.data?.description ??
      e.message;
    throw new Error(`[Getnet] ${msg}`);
  }
}

export async function getnetGet<T>(path: string): Promise<T> {
  try {
    const token = await getAccessToken();
    const { data } = await axios.get<T>(`${BASE_URL}${path}`, {
      headers: buildHeaders(token),
    });
    return data;
  } catch (err) {
    const e = err as AxiosError<{ message?: string; description?: string }>;
    const msg =
      e.response?.data?.message ??
      e.response?.data?.description ??
      e.message;
    throw new Error(`[Getnet] ${msg}`);
  }
}
