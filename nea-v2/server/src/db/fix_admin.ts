import { db } from './index';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function run() {
  console.log('Fixing admin password with bcrypt...');
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    
    const query = sql`
      INSERT INTO "profiles" ("id", "username", "email", "first_name", "last_name", "password_hash", "role_id", "status") 
      VALUES 
      ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', 'admin@example.com', 'Admin', 'User', ${hash}, '431fb6bc-2c6a-4888-b309-1f7ddd6a7e0e', 'active')
      ON CONFLICT (username) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        status = 'active';
    `;
    
    await db.execute(query);
    console.log('Admin user updated with bcrypt hash. You can now login with admin / admin123');
    process.exit(0);
  } catch (err) {
    console.error('Error running SQL:', err);
    process.exit(1);
  }
}

run();
