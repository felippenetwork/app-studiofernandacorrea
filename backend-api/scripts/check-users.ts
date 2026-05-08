import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function main() {
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 10 });
  console.log('\nauth.users:');
  authUsers.users.forEach((u) => console.log(`  ${u.id} | ${u.email} | confirmed=${u.email_confirmed_at ? 'yes' : 'no'}`));

  const { data: pubUsers } = await supabase.from('users').select('id, email, name').limit(10);
  console.log('\npublic.users:');
  (pubUsers ?? []).forEach((u: any) => console.log(`  ${u.id} | ${u.email} | ${u.name}`));
}
main().catch(console.error);
