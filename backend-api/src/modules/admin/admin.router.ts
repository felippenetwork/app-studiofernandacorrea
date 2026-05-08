import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { adminAuthMiddleware, requireRole } from '../../middleware/adminAuth.middleware';
import { adminService } from './admin.service';
import { adminAuthService } from '../admin-auth/admin-auth.service';
import { trinksService } from '../trinks/trinks.service';

export const adminRouter = Router();

adminRouter.use(adminAuthMiddleware);

// Fire-and-forget audit helper — never blocks the response
function audit(
  req: Request,
  action: string,
  entityType?: string,
  entityId?: string,
  changes?: Record<string, any>,
) {
  const admin = (req as any).adminUser;
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress;
  adminService
    .createAuditLog({
      adminUserId: admin?.id ?? 'unknown',
      adminEmail: admin?.email ?? 'unknown',
      action,
      entityType,
      entityId,
      changes,
      ipAddress: ip,
    })
    .catch(console.error);
}

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

const serviceVariationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  durationMinutes: z.number().int().positive().optional(),
  description: z.string().optional(),
});

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  durationMinutes: z.number().int().positive(),
  category: z.string().min(1),
  imageUrl: z.union([z.string().url(), z.literal('')]).optional().transform((v) => v || undefined),
  isActive: z.boolean().default(true),
  bookingFeeApplicable: z.boolean().default(true),
  bookingFeeType: z.enum(['fixed', 'percentage']).default('fixed'),
  bookingFeeValue: z.number().nonnegative().default(40),
  professionalIds: z.array(z.string()).optional(),
  variations: z.array(serviceVariationSchema).default([]),
});

adminRouter.get('/services', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.listServices() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string(), sortOrder: z.number().int().nonnegative() })).min(1),
});

adminRouter.patch('/services/reorder', requireRole('owner', 'gerente'), validate(reorderSchema), async (req: Request, res: Response): Promise<void> => {
  try { await adminService.reorderServices(req.body.items); res.json({ data: null, message: 'Ordem atualizada.' }); }
  catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.post('/services', requireRole('owner', 'gerente'), validate(serviceSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.createService(req.body);
    audit(req, 'service.create', 'service', data.id, { name: data.name });
    res.status(201).json({ data, message: 'Serviço criado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/services/:id', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.updateService(req.params.id, req.body);
    audit(req, 'service.update', 'service', req.params.id, { name: req.body.name });
    res.json({ data, message: 'Serviço atualizado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.delete('/services/:id', requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try {
    await adminService.deleteService(req.params.id);
    audit(req, 'service.delete', 'service', req.params.id);
    res.json({ data: null, message: 'Serviço removido.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Service Categories ───────────────────────────────────────────────────────

adminRouter.get('/service-categories', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.listServiceCategories() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

const categorySchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e _'),
  label: z.string().min(1),
});

// PUT /admin/service-categories  → reorder (full replacement)
adminRouter.put('/service-categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const { categories } = req.body as { categories: { key: string; label: string }[] };
    if (!Array.isArray(categories)) { res.status(400).json({ error: 'BadRequest', message: 'categories must be an array' }); return; }
    const adminId = (req as any).adminUser?.id ?? 'system';
    await adminService.setSetting('service_categories', categories, adminId);
    res.json({ data: categories, message: 'Ordem salva.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// PUT /admin/service-categories/:key  → upsert single
adminRouter.put('/service-categories/:key', validate(categorySchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).adminUser?.id ?? 'system';
    const data = await adminService.upsertServiceCategory(req.body, adminId);
    audit(req, 'category.upsert', 'service_category', req.params.key, { label: req.body.label });
    res.json({ data, message: 'Categoria salva.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.delete('/service-categories/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).adminUser?.id ?? 'system';
    const data = await adminService.deleteServiceCategory(req.params.key, adminId);
    audit(req, 'category.delete', 'service_category', req.params.key);
    res.json({ data, message: 'Categoria removida.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Professional Specialties ─────────────────────────────────────────────────

adminRouter.get('/professional-specialties', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.listProfessionalSpecialties() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

adminRouter.put('/professional-specialties', async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).adminUser?.id ?? 'system';
    const specialties = z.array(z.string().min(1)).parse(req.body.specialties ?? []);
    const data = await adminService.saveProfessionalSpecialties(specialties, adminId);
    audit(req, 'specialty.update', undefined, undefined, { count: specialties.length });
    res.json({ data, message: 'Especialidades salvas.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
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
  try {
    const data = await adminService.createProfessional(req.body);
    audit(req, 'professional.create', 'professional', (data as any).id, { name: req.body.name });
    res.status(201).json({ data, message: 'Profissional criado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/professionals/:id', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.updateProfessional(req.params.id, req.body);
    audit(req, 'professional.update', 'professional', req.params.id, { name: req.body.name });
    res.json({ data, message: 'Profissional atualizado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.delete('/professionals/:id', requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try {
    await adminService.deleteProfessional(req.params.id);
    audit(req, 'professional.delete', 'professional', req.params.id);
    res.json({ data: null, message: 'Profissional removido.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
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

const createCustomerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  acceptsMarketing: z.boolean().default(false),
  acceptsPush: z.boolean().default(false),
});

adminRouter.post('/customers', requireRole('owner', 'gerente', 'recepcao'), validate(createCustomerSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.createCustomer(req.body);
    audit(req, 'customer.create', 'customer', (data as any).id, { name: req.body.name, email: req.body.email });
    res.status(201).json({ data, message: 'Cliente cadastrada.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/customers/:id', requireRole('owner', 'gerente', 'recepcao'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.updateCustomer(req.params.id, req.body);
    audit(req, 'customer.update', 'customer', req.params.id, { name: req.body.name });
    res.json({ data, message: 'Cliente atualizado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
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
  try {
    const data = await adminService.createCoupon(req.body);
    audit(req, 'coupon.create', 'coupon', (data as any).id, { code: req.body.code });
    res.status(201).json({ data, message: 'Cupom criado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/coupons/:id', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.updateCoupon(req.params.id, req.body);
    audit(req, 'coupon.update', 'coupon', req.params.id, { code: req.body.code });
    res.json({ data, message: 'Cupom atualizado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.delete('/coupons/:id', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try {
    await adminService.deleteCoupon(req.params.id);
    audit(req, 'coupon.delete', 'coupon', req.params.id);
    res.json({ data: null, message: 'Cupom removido.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Benefits ─────────────────────────────────────────────────────────────────

adminRouter.get('/benefits', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.listBenefits() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

adminRouter.post('/benefits', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.createBenefit(req.body);
    audit(req, 'benefit.create', 'benefit', (data as any).id, { title: req.body.title });
    res.status(201).json({ data, message: 'Benefício criado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/benefits/:id', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.updateBenefit(req.params.id, req.body);
    audit(req, 'benefit.update', 'benefit', req.params.id, { title: req.body.title });
    res.json({ data, message: 'Benefício atualizado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.delete('/benefits/:id', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try {
    await adminService.deleteBenefit(req.params.id);
    audit(req, 'benefit.delete', 'benefit', req.params.id);
    res.json({ data: null, message: 'Benefício removido.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Appointments ─────────────────────────────────────────────────────────────

// GET /api/admin/appointments/available-slots — proxy to Trinks (must be before /:id routes)
adminRouter.get('/appointments/available-slots', async (req: Request, res: Response): Promise<void> => {
  try {
    const { professionalId, serviceId, date } = req.query as Record<string, string>;
    if (!professionalId || !serviceId || !date) {
      res.status(400).json({ error: 'BadRequest', message: 'professionalId, serviceId e date são obrigatórios.' });
      return;
    }
    const slots = await trinksService.getAvailableSlots(professionalId, serviceId, date);
    res.json({ data: slots });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

adminRouter.get('/appointments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, status, page = '1', limit = '20' } = req.query as Record<string, string>;
    res.json({ data: await adminService.listAppointments({ date, status, page: +page, limit: +limit }) });
  } catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

const createAppointmentSchema = z.object({
  userId: z.string(),
  serviceId: z.string(),
  professionalId: z.string(),
  appointmentDate: z.string(),
  appointmentTime: z.string(),
  status: z.enum(['confirmado', 'pendente_pagamento']).default('confirmado'),
  servicePrice: z.number().optional(),
  bookingFee: z.number().optional(),
  notes: z.string().optional(),
});

adminRouter.post('/appointments', requireRole('owner', 'gerente', 'recepcao'), validate(createAppointmentSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.createAppointment(req.body);
    audit(req, 'appointment.create', 'appointment', (data as any).id, { userId: req.body.userId, date: req.body.appointmentDate });
    res.status(201).json({ data, message: 'Agendamento criado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
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
    const data = await adminService.setSetting(req.params.key, req.body.value, admin.id);
    audit(req, 'settings.update', 'setting', req.params.key);
    res.json({ data, message: 'Configuração salva.' });
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
  try {
    const data = await adminAuthService.createAdmin(req.body);
    audit(req, 'admin_user.create', 'admin_user', (data as any).id, { email: req.body.email, role: req.body.role });
    res.status(201).json({ data, message: 'Usuário admin criado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.put('/users/:id', requireRole('owner'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await adminService.updateAdminUser(req.params.id, req.body);
    audit(req, 'admin_user.update', 'admin_user', req.params.id, { role: req.body.role });
    res.json({ data, message: 'Usuário atualizado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
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
    const data = await adminService.createPushCampaign(req.body, admin.id);
    audit(req, 'push_campaign.create', 'push_campaign', (data as any).id, { title: req.body.title });
    res.status(201).json({ data, message: 'Campanha criada.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.post('/push-campaigns/:id/send', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await adminService.sendPushCampaign(req.params.id);
    audit(req, 'push_campaign.send', 'push_campaign', req.params.id, { sent: result.sent });
    res.json({ data: result, message: `Campanha enviada para ${result.sent} dispositivos.` });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

adminRouter.patch('/push-campaigns/:id/toggle', requireRole('owner', 'gerente', 'marketing'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await adminService.toggleRecurringCampaign(req.params.id);
    audit(req, 'push_campaign.toggle', 'push_campaign', req.params.id, result);
    res.json({ data: result, message: result.recurrenceActive ? 'Campanha ativada.' : 'Campanha pausada.' });
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
    const data = await adminService.updateFeedbackStatus(req.params.id, status, admin.id);
    audit(req, 'feedback.status_update', 'feedback', req.params.id, { status });
    res.json({ data, message: 'Status atualizado.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// ─── Reviews Summary ──────────────────────────────────────────────────────────

adminRouter.get('/reviews/summary', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await adminService.getReviewsSummary() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});
