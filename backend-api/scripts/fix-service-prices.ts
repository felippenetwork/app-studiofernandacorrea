import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const prices: Record<string, number> = {
  '242dcfd1-7423-4764-84ff-7ec362ff0fcf': 180, // Cílios fio a fio clássico
  '1c4b6b5c-81ac-4661-b5c5-57bfd5d14ea0': 250, // Volume Brasileiro
};

async function main() {
  for (const [id, price] of Object.entries(prices)) {
    const { error } = await supabase.from('services').update({ price }).eq('id', id);
    if (error) console.error(`✗ ${id}: ${error.message}`);
    else console.log(`✓ Preço atualizado: id=${id} → R$${price}`);
  }
}
main().catch(console.error);
