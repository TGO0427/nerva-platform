import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
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
    // Get migration files from the migrations directory
    const migrationsDir = path.join(__dirname, '../../../infra/db/migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migrations directory not found: ${migrationsDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration file(s)`);

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get already applied migrations
    const appliedResult = await pool.query('SELECT name FROM _migrations');
    const applied = new Set(appliedResult.rows.map(r => r.name));

    let appliedCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`SKIP: ${file} (already applied)`);
        continue;
      }

      console.log(`APPLYING: ${file}...`);

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      try {
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        console.log(`SUCCESS: ${file}`);
        appliedCount++;
      } catch (error: unknown) {
        const err = error as Error;
        console.error(`FAILED: ${file}`);
        console.error(err.message);
        process.exit(1);
      }
    }

    console.log('\n========================================');
    console.log(`MIGRATIONS COMPLETE: ${appliedCount} applied`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
