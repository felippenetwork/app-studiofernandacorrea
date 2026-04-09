import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  email: z.string().email('E-mail inválido').toLowerCase(),
  phone: z.string().min(10, 'Telefone inválido').optional(),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)').optional().nullable(),
  accepts_marketing: z.boolean().default(false),
  accepts_push: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido').toLowerCase(),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
