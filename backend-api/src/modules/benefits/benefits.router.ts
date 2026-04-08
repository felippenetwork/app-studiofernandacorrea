import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';
import { DbBenefit } from '../../types';

export const benefitsRouter = Router();

benefitsRouter.use(authMiddleware);

const MOCK_BENEFITS: DbBenefit[] = [
  {
    id: 'ben-1', title: 'Programa de Fidelidade',
    description: 'A cada 5 agendamentos concluídos, ganhe um serviço de brinde.',
    type: 'exclusivo', image_url: null, cta: 'Saiba mais', cta_link: null,
    valid_until: null, is_active: true, sort_order: 0,
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ben-2', title: 'Semana da Beleza',
    description: '15% de desconto em todos os serviços de cabelo. Aproveite!',
    type: 'promocao', image_url: null, cta: 'Agendar agora', cta_link: null,
    valid_until: '2025-04-21', is_active: true, sort_order: 1,
    created_at: '2025-04-01T00:00:00Z', updated_at: '2025-04-01T00:00:00Z',
  },
  {
    id: 'ben-3', title: 'Linha Premium Chegou',
    description: 'Novos produtos de tratamento capilar disponíveis.',
    type: 'novidade', image_url: null, cta: 'Ver detalhes', cta_link: null,
    valid_until: null, is_active: true, sort_order: 2,
    created_at: '2025-04-01T00:00:00Z', updated_at: '2025-04-01T00:00:00Z',
  },
];

// GET /api/benefits
benefitsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!hasSupabase) {
      res.json({ data: MOCK_BENEFITS });
      return;
    }

    const { data, error } = await supabase
      .from('benefits')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json({ data: data ?? [] });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});
