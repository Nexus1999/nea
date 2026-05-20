import { db } from './index';
import { rolePermissions, permissions } from './schema';
import { eq } from 'drizzle-orm';

async function grantAll() {
  const adminRoleId = '431fb6bc-2c6a-4888-b309-1f7ddd6a7e0e';
  console.log(`🔑 Granting all permissions to Administrator role: ${adminRoleId}`);

  // Fetch all permissions
  const allPerms = await db.select().from(permissions);
  console.log(`Found ${allPerms.length} permissions.`);

  // Delete existing perms for this role to avoid duplicates
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, adminRoleId));

  // Insert all
  if (allPerms.length > 0) {
    await db.insert(rolePermissions).values(
      allPerms.map(p => ({
        roleId: adminRoleId,
        permissionId: p.id
      }))
    );
    console.log('✅ All permissions granted.');
  } else {
    console.log('⚠️ No permissions found to grant.');
  }
  
  process.exit(0);
}

grantAll();
