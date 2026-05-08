import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function main() {
  const { data } = await supabase.from('services').select('id, name, price, booking_fee_type, booking_fee_value, is_active');
  console.log(JSON.stringify(data, null, 2));
}
main().catch(console.error);
