import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { isDev } from '../config/env';

/**
 * Centralized error handler.
 * - In production: returns generic messages, never exposes stack traces.
 * - In development: returns full error details.
 * Must be registered as the LAST middleware in Express.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ZodError from validate middleware (should already be handled, just in case)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Dados inválidos.',
      details: isDev ? err.issues : undefined,
    });
    return;
  }

  if (err instanceof Error) {
    const isPrettyError =
      err.message.includes('não encontrado') ||
      err.message.includes('já cadastrado') ||
      err.message.includes('não pode ser') ||
      err.message.includes('inválido') ||
      err.message.includes('expirado') ||
      err.message.includes('já foi paga');

    const status = isPrettyError ? 400 : 500;
    const message = isPrettyError || isDev ? err.message : 'Erro interno do servidor.';

    if (!isPrettyError) {
      console.error('[error]', err.message, isDev ? err.stack : '');
    }

    res.status(status).json({
      error: isPrettyError ? 'BusinessError' : 'InternalError',
      message,
    });
    return;
  }

  console.error('[error] Unknown error:', err);
  res.status(500).json({ error: 'InternalError', message: 'Erro interno do servidor.' });
}
