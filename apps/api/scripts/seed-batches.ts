import { Pool } from 'pg';

async function seedBatches() {
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
    // Get tenant
    const tenantResult = await pool.query("SELECT id FROM tenants WHERE code = 'DEMO' LIMIT 1");
    if (tenantResult.rows.length === 0) {
      console.error('No DEMO tenant found.');
      process.exit(1);
    }
    const tenantId = tenantResult.rows[0].id;
    console.log(`Using tenant ID: ${tenantId}`);

    // Get items
    const itemsResult = await pool.query('SELECT id, sku FROM items WHERE tenant_id = $1', [tenantId]);
    const items = itemsResult.rows;
    console.log(`Found ${items.length} items`);

    // Get bins
    const binsResult = await pool.query(
      "SELECT id, code FROM bins WHERE tenant_id = $1 AND bin_type = 'STORAGE'",
      [tenantId]
    );
    const bins = binsResult.rows;
    console.log(`Found ${bins.length} storage bins`);

    // Clear existing batch data for clean demo
    console.log('\nClearing existing batch data...');
    await pool.query('DELETE FROM batches WHERE tenant_id = $1', [tenantId]);
    await pool.query('UPDATE stock_snapshot SET expiry_date = NULL, batch_id = NULL WHERE tenant_id = $1', [tenantId]);

    // Create batches with various expiry dates
    const today = new Date();
    const batches = [
      // EXPIRED batches (past date)
      { itemSku: 'WIDGET-001', batchNo: 'BTH-W001-001', daysFromNow: -10, bin: 'A-01-01', qty: 25 },
      { itemSku: 'GADGET-001', batchNo: 'BTH-G001-001', daysFromNow: -5, bin: 'A-02-01', qty: 15 },

      // CRITICAL batches (expiring within 7 days)
      { itemSku: 'WIDGET-001', batchNo: 'BTH-W001-002', daysFromNow: 3, bin: 'A-01-02', qty: 30 },
      { itemSku: 'WIDGET-002', batchNo: 'BTH-W002-001', daysFromNow: 5, bin: 'A-01-03', qty: 20 },
      { itemSku: 'PART-001', batchNo: 'BTH-P001-001', daysFromNow: 7, bin: 'B-01-01', qty: 100 },

      // WARNING batches (expiring within 30 days)
      { itemSku: 'GADGET-001', batchNo: 'BTH-G001-002', daysFromNow: 14, bin: 'A-02-01', qty: 50 },
      { itemSku: 'GADGET-002', batchNo: 'BTH-G002-001', daysFromNow: 21, bin: 'A-02-02', qty: 35 },
      { itemSku: 'PART-002', batchNo: 'BTH-P002-001', daysFromNow: 28, bin: 'B-01-02', qty: 80 },

      // OK batches (expiring after 30 days)
      { itemSku: 'WIDGET-001', batchNo: 'BTH-W001-003', daysFromNow: 60, bin: 'A-01-01', qty: 50 },
      { itemSku: 'CABLE-USB', batchNo: 'BTH-USB-001', daysFromNow: 90, bin: 'B-02-01', qty: 200 },
      { itemSku: 'CABLE-HDMI', batchNo: 'BTH-HDMI-001', daysFromNow: 120, bin: 'B-02-01', qty: 150 },
    ];

    console.log('\nCreating batches with expiry dates...');

    for (const batch of batches) {
      const item = items.find(i => i.sku === batch.itemSku);
      const bin = bins.find(b => b.code === batch.bin);

      if (!item || !bin) {
        console.log(`  SKIP: ${batch.batchNo} - item or bin not found`);
        continue;
      }

      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + batch.daysFromNow);

      // Create batch record
      const batchResult = await pool.query(`
        INSERT INTO batches (tenant_id, item_id, batch_no, expiry_date)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, item_id, batch_no) DO UPDATE SET expiry_date = $4
        RETURNING id
      `, [tenantId, item.id, batch.batchNo, expiryDate]);
      const batchId = batchResult.rows[0].id;

      // Update or create stock snapshot with batch info
      await pool.query(`
        INSERT INTO stock_snapshot (tenant_id, bin_id, item_id, batch_no, qty_on_hand, qty_reserved, expiry_date, batch_id)
        VALUES ($1, $2, $3, $4, $5, 0, $6, $7)
        ON CONFLICT (tenant_id, bin_id, item_id, batch_no)
        DO UPDATE SET
          qty_on_hand = EXCLUDED.qty_on_hand,
          expiry_date = EXCLUDED.expiry_date,
          batch_id = EXCLUDED.batch_id
      `, [tenantId, bin.id, item.id, batch.batchNo, batch.qty, expiryDate, batchId]);

      const status = batch.daysFromNow <= 0 ? 'EXPIRED' :
                     batch.daysFromNow <= 7 ? 'CRITICAL' :
                     batch.daysFromNow <= 30 ? 'WARNING' : 'OK';

      console.log(`  ${status}: ${batch.batchNo} (${batch.itemSku}) - expires ${expiryDate.toISOString().split('T')[0]} - ${batch.qty} units in ${batch.bin}`);
    }

    // Get summary
    const summary = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) as expired,
        COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '7 days') as critical,
        COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '7 days' AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') as warning,
        COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '30 days') as ok
      FROM stock_snapshot
      WHERE tenant_id = $1 AND expiry_date IS NOT NULL AND qty_on_hand > 0
    `, [tenantId]);

    console.log('\n========================================');
    console.log('BATCH SEEDING COMPLETE!');
    console.log('========================================');
    console.log('\nExpiry Alerts Summary:');
    console.log(`  EXPIRED:  ${summary.rows[0].expired} batches`);
    console.log(`  CRITICAL: ${summary.rows[0].critical} batches (within 7 days)`);
    console.log(`  WARNING:  ${summary.rows[0].warning} batches (within 30 days)`);
    console.log(`  OK:       ${summary.rows[0].ok} batches (30+ days)`);
    console.log('\nView at: /inventory/expiry-alerts');
    console.log('========================================\n');

  } catch (error) {
    console.error('Batch seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedBatches();
