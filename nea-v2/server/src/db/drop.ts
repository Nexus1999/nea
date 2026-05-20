import { db } from './index';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('🗑️ Dropping security and reference tables...');
  await db.execute(sql.raw(`
    DROP TABLE IF EXISTS role_permissions CASCADE; 
    DROP TABLE IF EXISTS profiles CASCADE; 
    DROP TABLE IF EXISTS sessions CASCADE; 
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS roles CASCADE; 
    DROP TABLE IF EXISTS permissions CASCADE;
    DROP TABLE IF EXISTS subjects CASCADE;
    DROP TABLE IF EXISTS examinations CASCADE;
    DROP TABLE IF EXISTS districts CASCADE;
    DROP TABLE IF EXISTS regions CASCADE;
  `));
  console.log('✅ Tables dropped');
  process.exit(0);
}
run();
