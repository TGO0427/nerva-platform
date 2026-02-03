import { Module, Global, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export const DATABASE_POOL = 'DATABASE_POOL';

const databasePoolFactory = {
  provide: DATABASE_POOL,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });

    return pool;
  },
};

@Global()
@Module({
  providers: [databasePoolFactory],
  exports: [DATABASE_POOL],
})
export class DatabaseModule implements OnModuleInit {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onModuleInit() {
    await this.runMigrations();
  }

  private async runMigrations() {
    console.log('🔄 Checking database migrations...');

    // Create migrations tracking table if it doesn't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get list of applied migrations
    const result = await this.pool.query('SELECT name FROM _migrations ORDER BY name');
    const appliedMigrations = new Set(result.rows.map((r) => r.name));

    // Find migration files
    const migrationsDir = path.resolve(__dirname, '../../../../../infra/db/migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 No migrations directory found, skipping migrations');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let migrationsRun = 0;

    for (const file of migrationFiles) {
      if (appliedMigrations.has(file)) {
        continue;
      }

      console.log(`📄 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      try {
        await this.pool.query(sql);
        await this.pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        console.log(`✅ Migration ${file} applied successfully`);
        migrationsRun++;
      } catch (error) {
        console.error(`❌ Migration ${file} failed:`, error);
        throw error;
      }
    }

    if (migrationsRun === 0) {
      console.log('✅ Database is up to date');
    } else {
      console.log(`✅ Applied ${migrationsRun} migration(s)`);
    }
  }
}
