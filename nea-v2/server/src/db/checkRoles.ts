import { db } from './index';
import { roles, profiles } from './schema';

async function check() {
  const allRoles = await db.select().from(roles);
  console.log('--- ROLES ---');
  console.table(allRoles);

  const allUsers = await db.select({
    username: profiles.username,
    roleId: profiles.roleId
  }).from(profiles);
  console.log('--- USERS ---');
  console.table(allUsers);
  
  process.exit(0);
}

check();
