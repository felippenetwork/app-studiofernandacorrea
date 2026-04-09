import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { adminAuthMiddleware, requireRole } from '../../middleware/adminAuth.middleware';
import { adminService } from './admin.service';
import { adminAuthService } from '../admin-auth/admin-auth.service';

export const adminRouter = Router();

adminRouter.use(adminAuthMiddleware);

// ─── Dashboard ────────────────────────────────────────────────────────────────

adminRouter.get('/dashboard/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ data: stats });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// ─── Services ─────────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  durationMinutes: z.number().int().positive(),
  category: z.string().min(1),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  bookingFeeApplicable: z.boolean().default(true),
  professionalIds: z.array(z.string()).optional(),
});

adminRouter.get('/services', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.listServices() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

adminRouter.post('/services', requireRole('owner', 'gerente'), validate(serviceSchema), async (req: Request, res: Response): Promise<void> => {
  try { res.status(201).json({ data: await adminService.createService(req.body), message: 'Serviço criado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/services/:id', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.updateService(req.params.id, req.body), message: 'Serviço atualizado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.delete('/services/:id', requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try { await adminService.deleteService(req.params.id); res.json({ data: null, message: 'Serviço removido.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Professionals ────────────────────────────────────────────────────────────

const professionalSchema = z.object({
  name: z.string().min(2),
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  trinksEmployeeId: z.string().optional(),
});

adminRouter.get('/professionals', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.listProfessionals() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

adminRouter.post('/professionals', requireRole('owner', 'gerente'), validate(professionalSchema), async (req: Request, res: Response): Promise<void> => {
  try { res.status(201).json({ data: await adminService.createProfessional(req.body), message: 'Profissional criado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/professionals/:id', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.updateProfessional(req.params.id, req.body), message: 'Profissional atualizado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.delete('/professionals/:id', requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try { await adminService.deleteProfessional(req.params.id); res.json({ data: null, message: 'Profissional removido.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Customers ────────────────────────────────────────────────────────────────

adminRouter.get('/customers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const result = await adminService.listCustomers({ search, page: +page, limit: +limit });
    res.json({ data: result });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

adminRouter.get('/customers/:id', async (req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.getCustomer(req.params.id) }); }
  catch (err) { res.status(404).json({ error: 'NotFound', message: (err as Error).message }); }
});

adminRouter.put('/customers/:id', requireRole('owner', 'gerente', 'recepcao'), async (req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.updateCustomer(req.params.id, req.body), message: 'Cliente atualizado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Coupons ──────────────────────────────────────────────────────────────────

const couponSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  title: z.string().min(2),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  minOrderValue: z.number().optional(),
  maxUsages: z.number().int().positive().optional(),
  validFrom: z.string(),
  validUntil: z.string(),
  status: z.enum(['ativo', 'expirado', 'esgotado']).default('ativo'),
  rules: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional(),
});

adminRouter.get('/coupons', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.listCoupons() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

adminRouter.post('/coupons', requireRole('owner', 'gerente', 'marketing'), validate(couponSchema), async (req: Request, res: Response): Promise<void> => {
  try { res.status(201).json({ data: await adminService.createCoupon(req.body), message: 'Cupom criado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/coupons/:id', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.updateCoupon(req.params.id, req.body), message: 'Cupom atualizado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.delete('/coupons/:id', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try { await adminService.deleteCoupon(req.params.id); res.json({ data: null, message: 'Cupom removido.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Benefits ─────────────────────────────────────────────────────────────────

adminRouter.get('/benefits', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.listBenefits() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

adminRouter.post('/benefits', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try { res.status(201).json({ data: await adminService.createBenefit(req.body), message: 'Benefício criado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/benefits/:id', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.updateBenefit(req.params.id, req.body), message: 'Benefício atualizado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.delete('/benefits/:id', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try { await adminService.deleteBenefit(req.params.id); res.json({ data: null, message: 'Benefício removido.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Appointments ─────────────────────────────────────────────────────────────

adminRouter.get('/appointments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, status, page = '1', limit = '20' } = req.query as Record<string, string>;
    res.json({ data: await adminService.listAppointments({ date, status, page: +page, limit: +limit }) });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

// ─── Payments ─────────────────────────────────────────────────────────────────

adminRouter.get('/payments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, from, to, page = '1', limit = '20' } = req.query as Record<string, string>;
    res.json({ data: await adminService.listPayments({ status, from, to, page: +page, limit: +limit }) });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

// ─── App Settings (Branding / Schedule / Integrations) ────────────────────────

adminRouter.get('/settings/:key', async (req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.getSetting(req.params.key) }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

adminRouter.put('/settings/:key', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = (req as any).adminUser;
    res.json({ data: await adminService.setSetting(req.params.key, req.body.value, admin.id), message: 'Configuração salva.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Admin Users ──────────────────────────────────────────────────────────────

adminRouter.get('/users', requireRole('owner'), async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.listAdminUsers() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

const createAdminUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['owner', 'gerente', 'recepcao', 'marketing', 'financeiro']),
});

adminRouter.post('/users', requireRole('owner'), validate(createAdminUserSchema), async (req: Request, res: Response): Promise<void> => {
  try { res.status(201).json({ data: await adminAuthService.createAdmin(req.body), message: 'Usuário admin criado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/users/:id', requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.updateAdminUser(req.params.id, req.body), message: 'Usuário atualizado.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

adminRouter.get('/audit-logs', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query as Record<string, string>;
    res.json({ data: await adminService.listAuditLogs({ page: +page, limit: +limit }) });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

// ─── Push Campaigns ───────────────────────────────────────────────────────────

adminRouter.get('/push-campaigns', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.listPushCampaigns() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

adminRouter.post('/push-campaigns', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = (req as any).adminUser;
    res.status(201).json({ data: await adminService.createPushCampaign(req.body, admin.id), message: 'Campanha criada.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// POST /api/admin/push-campaigns/:id/send — send campaign now
adminRouter.post('/push-campaigns/:id/send', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await adminService.sendPushCampaign(req.params.id);
    res.json({ data: result, message: `Campanha enviada para ${result.sent} dispositivos.` });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Feedback ─────────────────────────────────────────────────────────────────

adminRouter.get('/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
    res.json({ data: await adminService.listFeedback({ status, page: +page, limit: +limit }) });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

adminRouter.patch('/feedback/:id/status', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = (req as any).adminUser;
    const { status } = req.body as { status: 'aprovado' | 'rejeitado' };
    if (!['aprovado', 'rejeitado'].includes(status)) {
      res.status(400).json({ error: 'BadRequest', message: 'Status inválido.' });
      return;
    }
    res.json({ data: await adminService.updateFeedbackStatus(req.params.id, status, admin.id), message: 'Status atualizado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Reviews Summary ──────────────────────────────────────────────────────────

adminRouter.get('/reviews/summary', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.getReviewsSummary() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});
