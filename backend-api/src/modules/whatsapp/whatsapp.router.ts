import { Router, Request, Response } from 'express';
import { adminAuthMiddleware as requireAdminAuth, requireRole } from '../../middleware/adminAuth.middleware';
import * as wpp from './whatsapp.service';
import { connectBaileys, disconnectBaileys } from './baileys.manager';
import { z } from 'zod';

export const whatsappRouter = Router();

whatsappRouter.use(requireAdminAuth);

// GET /api/admin/whatsapp/config
whatsappRouter.get('/config', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cfg = await wpp.getConfig();
    res.json({ data: cfg });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

// POST /api/admin/whatsapp/config
const configSchema = z.object({
  provider:     z.string().default('evolution'),
  apiUrl:       z.string().optional().default(''),
  apiKey:       z.string().optional().default(''),
  instanceName: z.string().optional().default(''),
}).refine((d) => {
  if (d.provider !== 'baileys') {
    return !!d.apiUrl && !!d.apiKey && !!d.instanceName;
  }
  return true;
}, { message: 'apiUrl, apiKey e instanceName são obrigatórios para Evolution API' });

whatsappRouter.post('/config', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try {
    const input = configSchema.parse(req.body);
    const cfg = await wpp.saveConfig({
      provider:     input.provider,
      apiUrl:       input.apiUrl ?? '',
      apiKey:       input.apiKey ?? '',
      instanceName: input.instanceName ?? '',
    });
    res.json({ data: cfg, message: 'Configuração salva.' });
  } catch (err: any) {
    res.status(400).json({ error: 'BadRequest', message: err.errors?.[0]?.message ?? (err as Error).message });
  }
});

// PATCH /api/admin/whatsapp/config/active
whatsappRouter.patch('/config/active', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    await wpp.setActive(active);
    res.json({ message: active ? 'WhatsApp ativado.' : 'WhatsApp desativado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// GET /api/admin/whatsapp/status
whatsappRouter.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ data: await wpp.getStatus() });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

// POST /api/admin/whatsapp/connect  (Baileys only)
whatsappRouter.post('/connect', requireRole('owner', 'gerente'), async (_req: Request, res: Response): Promise<void> => {
  try {
    await connectBaileys();
    res.json({ message: 'Conexão Baileys iniciada. Aguarde o QR Code.' });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

// POST /api/admin/whatsapp/disconnect  (Baileys only)
whatsappRouter.post('/disconnect', requireRole('owner', 'gerente'), async (_req: Request, res: Response): Promise<void> => {
  try {
    await disconnectBaileys();
    res.json({ message: 'Desconectado.' });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

// GET /api/admin/whatsapp/templates
whatsappRouter.get('/templates', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ data: await wpp.getTemplates() });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

// PATCH /api/admin/whatsapp/templates/:id
whatsappRouter.patch('/templates/:id', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, isActive } = req.body;
    res.json({ data: await wpp.updateTemplate(req.params.id, { message, isActive }), message: 'Template atualizado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// POST /api/admin/whatsapp/send
const sendSchema = z.object({
  phone:         z.string().min(8),
  message:       z.string().min(1),
  recipientName: z.string().optional(),
  recipientId:   z.string().optional(),
  trigger:       z.string().optional(),
});
whatsappRouter.post('/send', requireRole('owner', 'gerente', 'recepcao'), async (req: Request, res: Response): Promise<void> => {
  try {
    const input = sendSchema.parse(req.body);
    const result = await wpp.sendMessage(input.phone, input.message, input.trigger, input.recipientId, input.recipientName);
    if (result.ok) {
      res.json({ message: 'Mensagem enviada!' });
    } else {
      res.status(400).json({ error: 'SendError', message: result.error });
    }
  } catch (err: any) {
    res.status(400).json({ error: 'BadRequest', message: err.errors?.[0]?.message ?? (err as Error).message });
  }
});

// GET /api/admin/whatsapp/log
whatsappRouter.get('/log', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt((req.query.limit as string) ?? '50') || 50;
    res.json({ data: await wpp.getLog(limit) });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});
