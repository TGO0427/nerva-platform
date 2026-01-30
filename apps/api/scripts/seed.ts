import { Pool } from 'pg';

async function seed() {
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
    // Get existing tenant
    const tenantResult = await pool.query("SELECT id FROM tenants WHERE code = 'DEMO' LIMIT 1");
    if (tenantResult.rows.length === 0) {
      console.error('No DEMO tenant found. Please ensure the database has been initialized.');
      process.exit(1);
    }
    const tenantId = tenantResult.rows[0].id;
    console.log(`Using tenant ID: ${tenantId}`);

    // Get existing site
    const siteResult = await pool.query('SELECT id FROM sites WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (siteResult.rows.length === 0) {
      console.error('No site found for tenant.');
      process.exit(1);
    }
    const siteId = siteResult.rows[0].id;
    console.log(`Using site ID: ${siteId}`);

    // Get existing user
    const userResult = await pool.query('SELECT id FROM users WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    const userId = userResult.rows[0]?.id || null;
    console.log(`Using user ID: ${userId}`);

    console.log('\nSeeding warehouse...');
    // Create warehouse
    const warehouseResult = await pool.query(`
      INSERT INTO warehouses (tenant_id, site_id, name, code)
      VALUES ($1, $2, 'Main Warehouse', 'WH-JHB-01')
      ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [tenantId, siteId]);
    const warehouseId = warehouseResult.rows[0].id;
    console.log(`Warehouse ID: ${warehouseId}`);

    console.log('Seeding bins...');
    // Create bins
    const bins = [
      { code: 'RCV-01', type: 'RECEIVING' },
      { code: 'RCV-02', type: 'RECEIVING' },
      { code: 'A-01-01', type: 'STORAGE', aisle: 'A', rack: '01', level: '01' },
      { code: 'A-01-02', type: 'STORAGE', aisle: 'A', rack: '01', level: '02' },
      { code: 'A-01-03', type: 'STORAGE', aisle: 'A', rack: '01', level: '03' },
      { code: 'A-02-01', type: 'STORAGE', aisle: 'A', rack: '02', level: '01' },
      { code: 'A-02-02', type: 'STORAGE', aisle: 'A', rack: '02', level: '02' },
      { code: 'B-01-01', type: 'STORAGE', aisle: 'B', rack: '01', level: '01' },
      { code: 'B-01-02', type: 'STORAGE', aisle: 'B', rack: '01', level: '02' },
      { code: 'B-02-01', type: 'STORAGE', aisle: 'B', rack: '02', level: '01' },
      { code: 'PICK-01', type: 'PICKING' },
      { code: 'PICK-02', type: 'PICKING' },
      { code: 'SHIP-01', type: 'SHIPPING' },
      { code: 'QC-01', type: 'QUARANTINE' },
    ];

    const binIds: Record<string, string> = {};
    for (const bin of bins) {
      const result = await pool.query(`
        INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tenant_id, warehouse_id, code) DO UPDATE SET bin_type = EXCLUDED.bin_type
        RETURNING id
      `, [tenantId, warehouseId, bin.code, bin.type, bin.aisle || null, bin.rack || null, bin.level || null]);
      binIds[bin.code] = result.rows[0].id;
    }
    console.log(`Created ${Object.keys(binIds).length} bins`);

    console.log('Seeding items...');
    // Create items
    const items = [
      { sku: 'WIDGET-001', description: 'Standard Widget', weight: 0.5 },
      { sku: 'WIDGET-002', description: 'Premium Widget', weight: 0.75 },
      { sku: 'GADGET-001', description: 'Mini Gadget', weight: 0.25 },
      { sku: 'GADGET-002', description: 'Super Gadget', weight: 1.0 },
      { sku: 'PART-001', description: 'Replacement Part A', weight: 0.1 },
      { sku: 'PART-002', description: 'Replacement Part B', weight: 0.15 },
      { sku: 'CABLE-USB', description: 'USB-C Cable 2m', weight: 0.05 },
      { sku: 'CABLE-HDMI', description: 'HDMI Cable 3m', weight: 0.08 },
      { sku: 'BOX-SML', description: 'Small Shipping Box', weight: 0.2 },
      { sku: 'BOX-LRG', description: 'Large Shipping Box', weight: 0.4 },
    ];

    const itemIds: Record<string, string> = {};
    for (const item of items) {
      const result = await pool.query(`
        INSERT INTO items (tenant_id, sku, description, uom, weight_kg)
        VALUES ($1, $2, $3, 'EA', $4)
        ON CONFLICT (tenant_id, sku) DO UPDATE SET description = EXCLUDED.description
        RETURNING id
      `, [tenantId, item.sku, item.description, item.weight]);
      itemIds[item.sku] = result.rows[0].id;
    }
    console.log(`Created ${Object.keys(itemIds).length} items`);

    console.log('Seeding customers...');
    // Create customers
    const customers = [
      { code: 'CUST001', name: 'Acme Corporation', email: 'orders@acme.co.za', addr: '123 Business Park', city: 'Johannesburg' },
      { code: 'CUST002', name: 'TechStart Solutions', email: 'purchasing@techstart.co.za', addr: '456 Innovation Hub', city: 'Cape Town' },
      { code: 'CUST003', name: 'Retail World', email: 'supply@retailworld.co.za', addr: '789 Commerce Street', city: 'Durban' },
      { code: 'CUST004', name: 'BuildRight Construction', email: 'orders@buildright.co.za', addr: '321 Industrial Road', city: 'Pretoria' },
      { code: 'CUST005', name: 'Green Energy Co', email: 'procurement@greenenergy.co.za', addr: '555 Eco Park', city: 'Port Elizabeth' },
    ];

    const customerIds: Record<string, string> = {};
    for (const cust of customers) {
      const result = await pool.query(`
        INSERT INTO customers (tenant_id, code, name, email, shipping_address_line1, shipping_city, shipping_country)
        VALUES ($1, $2, $3, $4, $5, $6, 'South Africa')
        ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [tenantId, cust.code, cust.name, cust.email, cust.addr, cust.city]);
      customerIds[cust.code] = result.rows[0].id;
    }
    console.log(`Created ${Object.keys(customerIds).length} customers`);

    console.log('Seeding suppliers...');
    // Create suppliers
    const suppliers = [
      { code: 'SUP001', name: 'Global Parts Inc', email: 'sales@globalparts.com' },
      { code: 'SUP002', name: 'China Electronics Ltd', email: 'export@chinaelec.cn' },
      { code: 'SUP003', name: 'Local Supplies SA', email: 'orders@localsupplies.co.za' },
    ];

    for (const sup of suppliers) {
      await pool.query(`
        INSERT INTO suppliers (tenant_id, code, name, email)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
      `, [tenantId, sup.code, sup.name, sup.email]);
    }
    console.log(`Created ${suppliers.length} suppliers`);

    console.log('Seeding stock inventory...');
    // Create stock snapshots
    const stockItems = [
      { bin: 'A-01-01', sku: 'WIDGET-001', qty: 100, reserved: 20 },
      { bin: 'A-01-02', sku: 'WIDGET-001', qty: 50, reserved: 0 },
      { bin: 'A-01-03', sku: 'WIDGET-002', qty: 75, reserved: 15 },
      { bin: 'A-02-01', sku: 'GADGET-001', qty: 200, reserved: 30 },
      { bin: 'A-02-02', sku: 'GADGET-002', qty: 45, reserved: 10 },
      { bin: 'B-01-01', sku: 'PART-001', qty: 500, reserved: 0 },
      { bin: 'B-01-02', sku: 'PART-002', qty: 350, reserved: 50 },
      { bin: 'B-02-01', sku: 'CABLE-USB', qty: 1000, reserved: 100 },
      { bin: 'B-02-01', sku: 'CABLE-HDMI', qty: 500, reserved: 50 },
    ];

    for (const stock of stockItems) {
      await pool.query(`
        INSERT INTO stock_snapshot (tenant_id, bin_id, item_id, batch_no, qty_on_hand, qty_reserved)
        VALUES ($1, $2, $3, '', $4, $5)
        ON CONFLICT (tenant_id, bin_id, item_id, batch_no) DO UPDATE SET
          qty_on_hand = EXCLUDED.qty_on_hand,
          qty_reserved = EXCLUDED.qty_reserved
      `, [tenantId, binIds[stock.bin], itemIds[stock.sku], stock.qty, stock.reserved]);
    }
    console.log(`Created ${stockItems.length} stock entries`);

    console.log('Seeding sales orders...');
    // Create sales orders
    const orders = [
      { no: 'SO-2024-0001', status: 'DRAFT', customer: 'CUST001', priority: 5 },
      { no: 'SO-2024-0002', status: 'CONFIRMED', customer: 'CUST002', priority: 3 },
      { no: 'SO-2024-0003', status: 'ALLOCATED', customer: 'CUST003', priority: 1 },
      { no: 'SO-2024-0004', status: 'PICKING', customer: 'CUST004', priority: 2 },
      { no: 'SO-2024-0005', status: 'SHIPPED', customer: 'CUST005', priority: 5 },
    ];

    const orderIds: Record<string, string> = {};
    for (const order of orders) {
      const result = await pool.query(`
        INSERT INTO sales_orders (tenant_id, site_id, warehouse_id, customer_id, order_no, status, priority, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (tenant_id, order_no) DO UPDATE SET status = EXCLUDED.status
        RETURNING id
      `, [tenantId, siteId, warehouseId, customerIds[order.customer], order.no, order.status, order.priority, userId]);
      orderIds[order.no] = result.rows[0].id;
    }
    console.log(`Created ${Object.keys(orderIds).length} sales orders`);

    // Create order lines
    const orderLines = [
      { order: 'SO-2024-0001', line: 1, sku: 'WIDGET-001', qty: 10, price: 99.99 },
      { order: 'SO-2024-0001', line: 2, sku: 'GADGET-001', qty: 5, price: 49.99 },
      { order: 'SO-2024-0002', line: 1, sku: 'WIDGET-002', qty: 20, price: 149.99 },
      { order: 'SO-2024-0002', line: 2, sku: 'CABLE-USB', qty: 50, price: 19.99 },
      { order: 'SO-2024-0003', line: 1, sku: 'GADGET-002', qty: 5, price: 299.99 },
      { order: 'SO-2024-0003', line: 2, sku: 'PART-001', qty: 100, price: 9.99 },
      { order: 'SO-2024-0004', line: 1, sku: 'WIDGET-001', qty: 15, price: 99.99 },
      { order: 'SO-2024-0004', line: 2, sku: 'PART-002', qty: 30, price: 14.99 },
      { order: 'SO-2024-0005', line: 1, sku: 'CABLE-HDMI', qty: 25, price: 29.99 },
    ];

    for (const line of orderLines) {
      await pool.query(`
        INSERT INTO sales_order_lines (tenant_id, sales_order_id, line_no, item_id, qty_ordered, unit_price)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, sales_order_id, line_no) DO UPDATE SET qty_ordered = EXCLUDED.qty_ordered
      `, [tenantId, orderIds[line.order], line.line, itemIds[line.sku], line.qty, line.price]);
    }
    console.log(`Created ${orderLines.length} order lines`);

    console.log('Seeding shipments...');
    // Create shipments
    const shipments = [
      { no: 'SHIP-2024-0001', order: 'SO-2024-0005', status: 'SHIPPED', weight: 2.0, carrier: 'DHL Express', tracking: 'DHL123456789' },
      { no: 'SHIP-2024-0002', order: 'SO-2024-0003', status: 'READY_FOR_DISPATCH', weight: 5.5 },
      { no: 'SHIP-2024-0003', order: 'SO-2024-0002', status: 'READY_FOR_DISPATCH', weight: 3.2 },
      { no: 'SHIP-2024-0004', order: 'SO-2024-0004', status: 'PENDING', weight: 1.8 },
    ];

    for (const ship of shipments) {
      await pool.query(`
        INSERT INTO shipments (tenant_id, site_id, warehouse_id, sales_order_id, shipment_no, status, total_weight_kg, carrier, tracking_no, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (tenant_id, shipment_no) DO UPDATE SET status = EXCLUDED.status
      `, [tenantId, siteId, warehouseId, orderIds[ship.order], ship.no, ship.status, ship.weight, ship.carrier || null, ship.tracking || null, userId]);
    }
    console.log(`Created ${shipments.length} shipments`);

    console.log('Seeding vehicles and drivers...');
    // Create vehicles
    const vehicles = [
      { reg: 'GP 123 ABC', make: 'Toyota', model: 'Hilux', capacity: 1000 },
      { reg: 'GP 456 DEF', make: 'Isuzu', model: 'NPR 400', capacity: 3500 },
      { reg: 'GP 789 GHI', make: 'Mercedes', model: 'Sprinter', capacity: 2000 },
    ];

    const vehicleIds: Record<string, string> = {};
    for (const v of vehicles) {
      const result = await pool.query(`
        INSERT INTO vehicles (tenant_id, site_id, reg_no, make, model, capacity_kg)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, reg_no) DO UPDATE SET make = EXCLUDED.make
        RETURNING id
      `, [tenantId, siteId, v.reg, v.make, v.model, v.capacity]);
      vehicleIds[v.reg] = result.rows[0].id;
    }
    console.log(`Created ${Object.keys(vehicleIds).length} vehicles`);

    // Create drivers
    const drivers = [
      { name: 'Mike Driver', phone: '+27 82 111 2222', license: 'DL123456' },
      { name: 'Sarah Wheels', phone: '+27 82 333 4444', license: 'DL789012' },
      { name: 'John Roads', phone: '+27 82 555 6666', license: 'DL345678' },
    ];

    const driverIds: string[] = [];
    for (const d of drivers) {
      const result = await pool.query(`
        INSERT INTO drivers (tenant_id, site_id, name, phone, license_no)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [tenantId, siteId, d.name, d.phone, d.license]);
      if (result.rows[0]) driverIds.push(result.rows[0].id);
    }
    // Get existing drivers if we didn't create new ones
    if (driverIds.length === 0) {
      const existingDrivers = await pool.query('SELECT id FROM drivers WHERE tenant_id = $1', [tenantId]);
      driverIds.push(...existingDrivers.rows.map((r: {id: string}) => r.id));
    }
    console.log(`Created/found ${driverIds.length} drivers`);

    console.log('Seeding dispatch trips...');
    // Create dispatch trips
    const trips = [
      { no: 'TRIP-2024-0001', status: 'COMPLETE', stops: 1 },
      { no: 'TRIP-2024-0002', status: 'PLANNED', stops: 0 },
      { no: 'TRIP-2024-0003', status: 'IN_PROGRESS', stops: 3 },
    ];

    for (let i = 0; i < trips.length; i++) {
      const trip = trips[i];
      await pool.query(`
        INSERT INTO dispatch_trips (tenant_id, site_id, warehouse_id, trip_no, status, total_stops,
          vehicle_id, driver_id, planned_date, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9)
        ON CONFLICT (tenant_id, trip_no) DO UPDATE SET status = EXCLUDED.status
      `, [
        tenantId, siteId, warehouseId, trip.no, trip.status, trip.stops,
        Object.values(vehicleIds)[i % Object.values(vehicleIds).length],
        driverIds[i % driverIds.length],
        userId
      ]);
    }
    console.log(`Created ${trips.length} trips`);

    console.log('\n========================================');
    console.log('SEED COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');

    // Show summary
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM items WHERE tenant_id = $1) as items,
        (SELECT COUNT(*) FROM customers WHERE tenant_id = $1) as customers,
        (SELECT COUNT(*) FROM suppliers WHERE tenant_id = $1) as suppliers,
        (SELECT COUNT(*) FROM warehouses WHERE tenant_id = $1) as warehouses,
        (SELECT COUNT(*) FROM bins WHERE tenant_id = $1) as bins,
        (SELECT COUNT(*) FROM stock_snapshot WHERE tenant_id = $1) as stock_entries,
        (SELECT COUNT(*) FROM sales_orders WHERE tenant_id = $1) as orders,
        (SELECT COUNT(*) FROM shipments WHERE tenant_id = $1) as shipments,
        (SELECT COUNT(*) FROM vehicles WHERE tenant_id = $1) as vehicles,
        (SELECT COUNT(*) FROM drivers WHERE tenant_id = $1) as drivers,
        (SELECT COUNT(*) FROM dispatch_trips WHERE tenant_id = $1) as trips
    `, [tenantId]);

    console.log('Data Summary:');
    console.log('-------------');
    Object.entries(counts.rows[0]).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
