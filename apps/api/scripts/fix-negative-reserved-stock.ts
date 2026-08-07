import 'dotenv/config';
import { Pool } from 'pg';

// One-off maintenance script: an old bug in the pick-wave fallback path
// (for orders allocated before stock_reservations existed) could release a
// reservation on a bin that was never actually reserved, driving
// stock_snapshot.qty_reserved negative. The underlying bug is fixed in
// FulfilmentService.createPickWave; this just clamps any pre-existing
// negative values back to 0.
async function fixNegativeReservedStock() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });

  try {
    const before = await pool.query(`
      SELECT ss.bin_id, b.code as bin_code, i.sku, ss.batch_no, ss.qty_reserved
      FROM stock_snapshot ss
      JOIN bins b ON b.id = ss.bin_id
      JOIN items i ON i.id = ss.item_id
      WHERE ss.qty_reserved < 0
      ORDER BY ss.qty_reserved ASC
    `);

    if (before.rows.length === 0) {
      console.log('No negative qty_reserved rows found. Nothing to fix.');
      return;
    }

    console.log(`Found ${before.rows.length} row(s) with negative qty_reserved:`);
    for (const row of before.rows) {
      console.log(`  ${row.sku} @ ${row.bin_code} (batch ${row.batch_no || 'none'}): ${row.qty_reserved}`);
    }

    const result = await pool.query(`
      UPDATE stock_snapshot SET qty_reserved = 0 WHERE qty_reserved < 0
    `);

    console.log(`\nClamped ${result.rowCount} row(s) back to qty_reserved = 0.`);
  } finally {
    await pool.end();
  }
}

fixNegativeReservedStock().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
