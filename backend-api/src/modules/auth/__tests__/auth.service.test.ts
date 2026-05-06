import bcrypt from 'bcryptjs';
import { authService } from '../auth.service';

// ─── Mock external dependencies ───────────────────────────────────────────────

jest.mock('../../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-min-32-chars-xxxxxxxxx',
    JWT_EXPIRES_IN: '7d',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-x',
    JWT_REFRESH_EXPIRES_IN: '30d',
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeUser = (overrides = {}) => ({
  name: 'Ana Silva',
  email: `ana+${Date.now()}@example.com`,
  phone: '11999990000',
  password: 'Senha@2026',
  accepts_marketing: false,
  accepts_push: true,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('authService (mock mode — no Supabase)', () => {
  describe('register', () => {
    it('cria conta e retorna user + tokens', async () => {
      const input = makeUser();
      const result = await authService.register(input);

      expect(result.emailVerificationRequired).toBe(false);
      if (result.emailVerificationRequired) return;

      expect(result.user.email).toBe(input.email);
      expect(result.user.name).toBe(input.name);
      expect((result.user as any).password_hash).toBeUndefined();
      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();
    });

    it('lança erro para e-mail duplicado', async () => {
      const input = makeUser({ email: 'duplicado@example.com' });
      await authService.register(input);
      await expect(authService.register(input)).rejects.toThrow('E-mail já cadastrado.');
    });

    it('hash da senha nunca é exposto no retorno', async () => {
      const input = makeUser();
      const result = await authService.register(input);
      if (result.emailVerificationRequired) return;
      expect((result.user as any).password_hash).toBeUndefined();
    });
  });

  describe('login', () => {
    it('retorna user + tokens com credenciais corretas', async () => {
      const input = makeUser({ email: 'login-ok@example.com' });
      await authService.register(input);

      const result = await authService.login({ email: input.email, password: input.password });
      expect(result.user.email).toBe(input.email);
      expect(result.tokens.accessToken).toBeTruthy();
    });

    it('lança erro para senha incorreta', async () => {
      const input = makeUser({ email: 'login-wrong@example.com' });
      await authService.register(input);

      await expect(
        authService.login({ email: input.email, password: 'senhaerrada' })
      ).rejects.toThrow('E-mail ou senha incorretos.');
    });

    it('lança erro para e-mail não cadastrado', async () => {
      await expect(
        authService.login({ email: 'naoexiste@example.com', password: 'qualquer' })
      ).rejects.toThrow('E-mail ou senha incorretos.');
    });
  });

  describe('refreshTokens', () => {
    it('gera novos tokens a partir de refresh token válido', async () => {
      const input = makeUser({ email: 'refresh@example.com' });
      const reg = await authService.register(input);
      if (reg.emailVerificationRequired) return;

      const newTokens = await authService.refreshTokens(reg.tokens.refreshToken);
      expect(newTokens.accessToken).toBeTruthy();
      expect(newTokens.refreshToken).toBeTruthy();
    });

    it('lança erro para refresh token inválido', async () => {
      await expect(authService.refreshTokens('token-invalido')).rejects.toThrow(
        'Refresh token inválido ou expirado.'
      );
    });
  });

  describe('getUserById', () => {
    it('retorna usuário existente sem expor password_hash', async () => {
      const input = makeUser({ email: 'getme@example.com' });
      const reg = await authService.register(input);
      if (reg.emailVerificationRequired) return;

      const user = await authService.getUserById(reg.user.id);
      expect(user.email).toBe(input.email);
      expect((user as any).password_hash).toBeUndefined();
    });

    it('lança erro para id inexistente', async () => {
      await expect(authService.getUserById('id-nao-existe')).rejects.toThrow(
        'Usuário não encontrado.'
      );
    });
  });
});
