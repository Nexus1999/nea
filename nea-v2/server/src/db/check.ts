import { db } from './index';
import { sql } from 'drizzle-orm';

async function check() {
  const res = await db.execute(sql.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'regions'"));
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}
check();
