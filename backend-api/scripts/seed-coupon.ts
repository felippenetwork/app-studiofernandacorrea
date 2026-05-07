import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const today = new Date();
const nextYear = new Date(today);
nextYear.setFullYear(nextYear.getFullYear() + 1);
const fmt = (d: Date) => d.toISOString().split('T')[0];

const coupons = [
  {
    code: 'TESTE10',
    title: '10% de desconto (teste)',
    description: '10% de desconto em qualquer serviço — cupom de teste.',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: null,
    max_usages: null,
    used_count: 0,
    valid_from: fmt(today),
    valid_until: fmt(nextYear),
    status: 'ativo',
    rules: ['Cupom de teste — sem restrições'],
    image_url: null,
    applicable_services: null,
  },
  {
    code: 'DESC30',
    title: 'R$ 30 de desconto (teste)',
    description: 'R$ 30,00 fixo de desconto em qualquer serviço.',
    discount_type: 'fixed',
    discount_value: 30,
    min_order_value: 80,
    max_usages: null,
    used_count: 0,
    valid_from: fmt(today),
    valid_until: fmt(nextYear),
    status: 'ativo',
    rules: ['Valor mínimo do serviço: R$ 80,00'],
    image_url: null,
    applicable_services: null,
  },
];

async function main() {
  for (const c of coupons) {
    const { data, error } = await supabase
      .from('coupons')
      .upsert(c, { onConflict: 'code' })
      .select('id, code')
      .single();

    if (error) {
      console.error(`✗ ${c.code}:`, error.message);
    } else {
      console.log(`✓ Cupom criado: ${data.code} (${data.id})`);
    }
  }
}

main().catch(console.error);
