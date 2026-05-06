import request from 'supertest';
import app from '../../../main';

// ─── Mock external dependencies ───────────────────────────────────────────────

jest.mock('../../../config/env', () => ({
  env: {
    PORT: 3001,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-min-32-chars-xxxxxxxxx',
    JWT_EXPIRES_IN: '7d',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-x',
    JWT_REFRESH_EXPIRES_IN: '30d',
    ADMIN_JWT_SECRET: 'test-admin-secret-min-32-chars-xxx',
    ALLOWED_ORIGINS: '*',
    SMTP_HOST: undefined,
    SMTP_USER: undefined,
    SMTP_PASS: undefined,
    API_BASE_URL: 'http://localhost:3001/api',
  },
  hasSupabase: false,
  isDev: true,
  hasTrinks: false,
  hasMercadoPago: false,
}));

jest.mock('../../../services/email.service', () => ({
  emailService: {
    hasSmtp: false,
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendWelcome: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../config/supabase', () => ({ supabase: {} }));
jest.mock('../../../scheduler', () => ({ startCronJobs: jest.fn() }));
jest.mock('../../../modules/admin/admin.service', () => ({
  adminService: { getSetting: jest.fn().mockResolvedValue(null) },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

let emailCounter = 0;
const uniqueEmail = () => `test${++emailCounter}+${Date.now()}@example.com`;

const registerUser = (overrides = {}) =>
  request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test User',
      email: uniqueEmail(),
      phone: '11999990000',
      password: 'Senha@2026',
      ...overrides,
    });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('201 — cria conta com dados válidos', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBeDefined();
    expect(res.body.data.tokens.accessToken).toBeDefined();
  });

  it('400 — rejeita senha curta (< 8 chars)', async () => {
    const res = await registerUser({ password: '123' });
    expect(res.status).toBe(400);
  });

  it('400 — rejeita e-mail inválido', async () => {
    const res = await registerUser({ email: 'nao-e-email' });
    expect(res.status).toBe(400);
  });

  it('400 — rejeita campos obrigatórios ausentes', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: uniqueEmail() });
    expect(res.status).toBe(400);
  });

  it('409 — rejeita e-mail duplicado', async () => {
    const email = uniqueEmail();
    await registerUser({ email });
    const res = await registerUser({ email });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('200 — login com credenciais corretas', async () => {
    const email = uniqueEmail();
    await registerUser({ email });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Senha@2026' });

    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeDefined();
  });

  it('401 — senha incorreta', async () => {
    const email = uniqueEmail();
    await registerUser({ email });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'senhaerrada' });

    expect(res.status).toBe(401);
  });

  it('401 — e-mail não cadastrado', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@example.com', password: 'Senha@2026' });

    expect(res.status).toBe(401);
  });

  it('400 — rejeita body inválido', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nao-e-email' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/refresh', () => {
  it('200 — retorna novos tokens com refresh válido', async () => {
    const email = uniqueEmail();
    const reg = await registerUser({ email });
    const refreshToken = reg.body.data.tokens.refreshToken;

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('401 — rejeita refresh token inválido', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'token-invalido' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('200 — retorna perfil com token válido', async () => {
    const email = uniqueEmail();
    const reg = await registerUser({ email });
    const { accessToken } = reg.body.data.tokens;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
  });

  it('401 — sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 — token inválido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('400 — mock mode sem Supabase retorna erro esperado', async () => {
    const email = uniqueEmail();
    await registerUser({ email });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email });

    // Em mock mode sem Supabase, o service lança "não disponível em modo dev"
    expect(res.status).toBe(400);
  });

  it('400 — e-mail inválido é rejeitado pelo validator', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nao-e-email' });

    expect(res.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('200 — health check responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
