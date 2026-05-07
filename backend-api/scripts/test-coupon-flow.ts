/**
 * End-to-end test: coupon validation + appointment creation flow
 */
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE = 'http://localhost:3000/api';
const SECRET = process.env.JWT_SECRET!;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

function pass(msg: string) { console.log(`  ✓ ${msg}`); }
function fail(msg: string) { console.error(`  ✗ ${msg}`); process.exitCode = 1; }
function makeToken(userId: string) { return jwt.sign({ sub: userId }, SECRET, { expiresIn: '1h' }); }

async function getRealUserId(): Promise<string> {
  // Our app uses its own public.users table (IDs independent from Supabase auth.users)
  const { data: pubUsers, error } = await supabase
    .from('users').select('id, email').limit(5);
  if (error || !pubUsers?.length) throw new Error(`No users in public.users: ${error?.message}`);
  const user = pubUsers[0] as { id: string; email: string };
  console.log(`  Using: ${user.email} (${user.id})`);
  return user.id;
}

async function main() {
  console.log('\n── Setup ──────────────────────────────────────────');
  const userId = await getRealUserId();
  const headers = { Authorization: `Bearer ${makeToken(userId)}` };

  console.log('\n── 1. Coupon validation ───────────────────────────');

  try {
    const { data } = await axios.post(`${BASE}/coupons/validate`, { code: 'TESTE10' }, { headers });
    const c = data.data;
    if (c.code === 'TESTE10' && c.discount_type === 'percentage' && c.discount_value === 10) {
      pass(`TESTE10 válido — ${c.discount_value}% off, status: ${c.status}`);
    } else {
      fail(`TESTE10 dados inesperados: ${JSON.stringify(c)}`);
    }
  } catch (e: any) {
    fail(`TESTE10: ${e.response?.data?.message ?? e.message}`);
  }

  try {
    const { data } = await axios.post(`${BASE}/coupons/validate`, { code: 'DESC30' }, { headers });
    const c = data.data;
    if (c.code === 'DESC30' && c.discount_type === 'fixed' && c.discount_value === 30) {
      pass(`DESC30 válido — R$${c.discount_value} off, mínimo: R$${c.min_order_value}`);
    } else {
      fail(`DESC30 dados inesperados`);
    }
  } catch (e: any) {
    fail(`DESC30: ${e.response?.data?.message ?? e.message}`);
  }

  try {
    await axios.post(`${BASE}/coupons/validate`, { code: 'NAOEXISTE' }, { headers });
    fail('Cupom inválido deveria retornar 404');
  } catch (e: any) {
    if (e.response?.status === 404) pass('Cupom inválido → 404 (correto)');
    else fail(`Cupom inválido status inesperado: ${e.response?.status}`);
  }

  console.log('\n── 2. Serviços e profissionais ────────────────────');

  let serviceId: string, professionalId: string;
  try {
    const { data } = await axios.get(`${BASE}/services`, { headers });
    serviceId = data.data[0]?.id;
    pass(`${data.data.length} serviços — usando: ${data.data[0]?.name} (${serviceId})`);
  } catch (e: any) {
    fail(`GET /services: ${e.message}`); return;
  }

  try {
    const { data } = await axios.get(`${BASE}/professionals`, { headers });
    professionalId = data.data[0]?.id;
    pass(`${data.data.length} profissionais — usando: ${data.data[0]?.name}`);
  } catch (e: any) {
    fail(`GET /professionals: ${e.message}`); return;
  }

  console.log('\n── 3. Criar agendamento ───────────────────────────');

  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + 2);
  const dateStr = appointmentDate.toISOString().split('T')[0];

  let appointmentId: string;
  try {
    const { data } = await axios.post(`${BASE}/appointments`, {
      serviceId, professionalId,
      appointmentDate: dateStr,
      appointmentTime: '10:00',
    }, { headers });
    const a = data.data;
    appointmentId = a.id;
    pass(`Agendamento criado: ${appointmentId}`);
    pass(`  status=${a.status}, taxa=${a.booking_fee}, preço=${a.service_price}`);
  } catch (e: any) {
    fail(`POST /appointments: ${JSON.stringify(e.response?.data ?? e.message)}`); return;
  }

  console.log('\n── 4. Pagar taxa de reserva (simulação via DB) ────');

  // MP_ACCESS_TOKEN has a placeholder — bypass the API and simulate directly in DB
  // This mirrors what _simulatePayment does internally
  const { data: apptRow } = await supabase.from('appointments').select('booking_fee').eq('id', appointmentId).single();
  const amount = (apptRow as any)?.booking_fee ?? 40;

  const { data: payRow, error: payErr } = await supabase.from('payments').insert({
    user_id: userId,
    appointment_id: appointmentId,
    amount,
    type: 'booking_fee',
    method: 'pix',
    status: 'aprovado',
    external_payment_id: `sim-test-${Date.now()}`,
  }).select('id').single();

  if (payErr) { fail(`Inserir payment: ${payErr.message}`); return; }
  const paymentId = (payRow as any).id;
  pass(`Payment record criado: ${paymentId}, amount=${amount}`);

  const { error: confirmErr } = await supabase.from('appointments').update({
    status: 'confirmado',
    payment_status: 'aprovado',
    payment_id: paymentId,
    updated_at: new Date().toISOString(),
  }).eq('id', appointmentId);

  if (confirmErr) { fail(`Confirmar appointment: ${confirmErr.message}`); return; }
  pass('Appointment marcado como confirmado via DB');

  console.log('\n── 5. Verificar agendamento confirmado ────────────');

  try {
    const { data } = await axios.get(`${BASE}/appointments/${appointmentId}`, { headers });
    const a = data.data;
    if (a.status === 'confirmado' && a.payment_status === 'aprovado') {
      pass(`Agendamento confirmado ✓ status=${a.status}, pagamento=${a.payment_status}`);
    } else {
      fail(`Estado inesperado: status=${a.status}, pagamento=${a.payment_status}`);
    }
  } catch (e: any) {
    fail(`GET /appointments/:id: ${e.message}`);
  }

  console.log('\n── 6. Limpeza ─────────────────────────────────────');
  await supabase.from('payments').delete().eq('appointment_id', appointmentId);
  await supabase.from('appointments').delete().eq('id', appointmentId);
  pass('Agendamento de teste removido');

  console.log('\n──────────────────────────────────────────────────\n');
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
