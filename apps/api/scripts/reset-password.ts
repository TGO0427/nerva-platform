import { Pool } from 'pg';
import * as argon2 from 'argon2';

async function resetPassword() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Usage: npx ts-node scripts/reset-password.ts <email> <new-password>');
    console.error('Example: npx ts-node scripts/reset-password.ts admin@demo.com MyNewPass123');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters long');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    // Find user
    const result = await pool.query(
      'SELECT id, email, display_name, tenant_id, is_active FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    const user = result.rows[0];
    console.log(`Found user: ${user.display_name} (${user.email}), tenant: ${user.tenant_id}, active: ${user.is_active}`);

    if (!user.is_active) {
      console.warn('WARNING: This user account is disabled. Password will be reset but login will still fail until the account is re-enabled.');
    }

    // Hash new password
    const passwordHash = await argon2.hash(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, user.id],
    );

    console.log(`Password reset successfully for ${email}`);
  } catch (error) {
    console.error('Failed to reset password:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetPassword();
