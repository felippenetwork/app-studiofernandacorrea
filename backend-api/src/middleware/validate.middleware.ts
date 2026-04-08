import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      res.status(400).json({
        error: 'ValidationError',
        message: 'Dados inválidos.',
        details: errors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[error]', err);

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'ValidationError', message: err.message });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ error: 'InternalError', message: err.message });
    return;
  }

  res.status(500).json({ error: 'InternalError', message: 'Erro interno do servidor.' });
}
