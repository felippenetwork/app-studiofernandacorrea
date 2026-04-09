import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),

  // Trinks
  TRINKS_API_URL: z.string().url().optional(),
  TRINKS_API_KEY: z.string().optional(),
  TRINKS_COMPANY_ID: z.string().optional(),

  // Mercado Pago
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_PUBLIC_KEY: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),

  // Backend public URL (used as webhook notification_url for MP)
  API_BASE_URL: z.string().url().optional(),

  // Trinks webhook signature verification
  TRINKS_WEBHOOK_SECRET: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:19000,exp://localhost:19000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[config] Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  // Don't crash in dev if optional vars are missing
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

export const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: 'development' as const,
      PORT: 3000,
      JWT_SECRET: 'dev-secret-change-in-production-must-be-long',
      JWT_EXPIRES_IN: '7d',
      JWT_REFRESH_SECRET: 'dev-refresh-secret-change-in-production-long',
      JWT_REFRESH_EXPIRES_IN: '30d',
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_KEY: undefined,
      TRINKS_API_URL: undefined,
      TRINKS_API_KEY: undefined,
      TRINKS_COMPANY_ID: undefined,
      MP_ACCESS_TOKEN: undefined,
      MP_PUBLIC_KEY: undefined,
      MP_WEBHOOK_SECRET: undefined,
      API_BASE_URL: undefined,
      TRINKS_WEBHOOK_SECRET: undefined,
      ALLOWED_ORIGINS: 'http://localhost:19000,exp://localhost:19000',
    };

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const hasTrinks = !!(env.TRINKS_API_URL && env.TRINKS_API_KEY);
export const hasSupabase = !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);
export const hasMercadoPago = !!env.MP_ACCESS_TOKEN;
