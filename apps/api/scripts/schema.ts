import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function applySchema() {
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
    const schemaPath = path.join(__dirname, '../../../infra/db/schema.sql');

    if (!fs.existsSync(schemaPath)) {
      console.error(`Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    console.log('Reading schema file...');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Applying schema (this may take a moment)...');
    await pool.query(sql);

    console.log('\n========================================');
    console.log('SCHEMA APPLIED SUCCESSFULLY!');
    console.log('========================================\n');

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Schema application failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applySchema();
