import { Pool } from 'pg';
import * as argon2 from 'argon2';

async function init() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to database...');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    // Check if tenant already exists
    let tenantId: string;
    const existing = await pool.query("SELECT id FROM tenants WHERE code = 'DEMO'");
    if (existing.rows.length > 0) {
      console.log('DEMO tenant already exists, using existing...');
      tenantId = existing.rows[0].id;
    } else {
      console.log('Creating DEMO tenant...');
      const tenantResult = await pool.query(`
        INSERT INTO tenants (code, name)
        VALUES ('DEMO', 'Demo Company')
        RETURNING id
      `);
      tenantId = tenantResult.rows[0].id;
    }
    console.log(`Tenant ID: ${tenantId}`);

    // Check/create site
    let siteId: string;
    const existingSite = await pool.query("SELECT id FROM sites WHERE tenant_id = $1 AND code = 'JHB'", [tenantId]);
    if (existingSite.rows.length > 0) {
      console.log('Site already exists, using existing...');
      siteId = existingSite.rows[0].id;
    } else {
      console.log('Creating site...');
      const siteResult = await pool.query(`
        INSERT INTO sites (tenant_id, code, name)
        VALUES ($1, 'JHB', 'Johannesburg Site')
        RETURNING id
      `, [tenantId]);
      siteId = siteResult.rows[0].id;
    }
    console.log(`Site ID: ${siteId}`);

    // Check/create role
    let roleId: string;
    const existingRole = await pool.query("SELECT id FROM roles WHERE tenant_id = $1 AND name = 'Admin'", [tenantId]);
    if (existingRole.rows.length > 0) {
      console.log('Admin role already exists, using existing...');
      roleId = existingRole.rows[0].id;
    } else {
      console.log('Creating admin role...');
      const roleResult = await pool.query(`
        INSERT INTO roles (tenant_id, name, description)
        VALUES ($1, 'Admin', 'Full system access')
        RETURNING id
      `, [tenantId]);
      roleId = roleResult.rows[0].id;

      // Assign all permissions to admin role
      console.log('Assigning all permissions to admin role...');
      await pool.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT $1, id FROM permissions
        ON CONFLICT DO NOTHING
      `, [roleId]);
    }
    console.log(`Role ID: ${roleId}`);

    // Check/create user
    let userId: string;
    const existingUser = await pool.query("SELECT id FROM users WHERE tenant_id = $1 AND email = 'admin@demo.com'", [tenantId]);
    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists, using existing...');
      userId = existingUser.rows[0].id;
    } else {
      console.log('Creating admin user...');
      const passwordHash = await argon2.hash('admin123');
      const userResult = await pool.query(`
        INSERT INTO users (tenant_id, email, password_hash, display_name, is_active)
        VALUES ($1, 'admin@demo.com', $2, 'Admin User', true)
        RETURNING id
      `, [tenantId, passwordHash]);
      userId = userResult.rows[0].id;
    }
    console.log(`User ID: ${userId}`);

    // Check/create user role assignment
    const existingUserRole = await pool.query("SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2", [userId, roleId]);
    if (existingUserRole.rows.length > 0) {
      console.log('User role assignment already exists...');
    } else {
      console.log('Assigning role to user...');
      await pool.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
      `, [userId, roleId]);
    }

    console.log('\n========================================');
    console.log('INITIALIZATION COMPLETE!');
    console.log('========================================');
    console.log('\nLogin credentials:');
    console.log('  Tenant Code: DEMO');
    console.log('  Email: admin@demo.com');
    console.log('  Password: admin123');
    console.log('========================================\n');

  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
