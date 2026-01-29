import { Inject } from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import { DATABASE_POOL } from './database.module';

export abstract class BaseRepository {
  constructor(@Inject(DATABASE_POOL) protected readonly pool: Pool) {}

  protected async query<T extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    const result = await this.pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (duration > 100) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  }

  protected async queryOne<T extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  protected async queryMany<T extends QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  protected async execute(
    text: string,
    params?: unknown[],
  ): Promise<number> {
    const result = await this.query(text, params);
    return result.rowCount ?? 0;
  }

  protected async transaction<T>(
    fn: (client: Pool) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client as unknown as Pool);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
