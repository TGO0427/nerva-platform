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

    // Get or create sites
    const siteConfigs = [
      { name: 'Klapmuts K58', code: 'K58' },
      { name: 'Klapmuts GWF', code: 'GWF' },
      { name: 'Pretoria', code: 'PTA' },
    ];

    const siteIds: Record<string, string> = {};
    for (const site of siteConfigs) {
      const result = await pool.query(`
        INSERT INTO sites (tenant_id, name, code)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [tenantId, site.name, site.code]);
      siteIds[site.code] = result.rows[0].id;
    }
    const siteId = siteIds['K58']; // Primary site for seed data
    console.log(`Sites created: ${Object.entries(siteIds).map(([k, v]) => `${k}=${v}`).join(', ')}`);

    // Get existing user
    const userResult = await pool.query('SELECT id FROM users WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    const userId = userResult.rows[0]?.id || null;
    console.log(`Using user ID: ${userId}`);

    console.log('\nSeeding warehouses...');
    // Create one warehouse per site
    const warehouseConfigs = [
      { site: 'K58', name: 'Klapmuts K58 Warehouse', code: 'WH-K58' },
      { site: 'GWF', name: 'Klapmuts GWF Warehouse', code: 'WH-GWF' },
      { site: 'PTA', name: 'Pretoria Warehouse', code: 'WH-PTA' },
    ];

    const warehouseIds: Record<string, string> = {};
    for (const wh of warehouseConfigs) {
      const result = await pool.query(`
        INSERT INTO warehouses (tenant_id, site_id, name, code)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [tenantId, siteIds[wh.site], wh.name, wh.code]);
      warehouseIds[wh.site] = result.rows[0].id;
    }
    const warehouseId = warehouseIds['K58']; // Primary warehouse for seed data
    console.log(`Warehouses: ${Object.entries(warehouseIds).map(([k, v]) => `${k}=${v}`).join(', ')}`);

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
    console.log(`Created ${Object.keys(binIds).length} bins for K58`);

    // Create bins for GWF and PTA warehouses
    const secondaryBins = [
      { code: 'RCV-01', type: 'RECEIVING' },
      { code: 'A-01-01', type: 'STORAGE', aisle: 'A', rack: '01', level: '01' },
      { code: 'A-01-02', type: 'STORAGE', aisle: 'A', rack: '01', level: '02' },
      { code: 'A-02-01', type: 'STORAGE', aisle: 'A', rack: '02', level: '01' },
      { code: 'B-01-01', type: 'STORAGE', aisle: 'B', rack: '01', level: '01' },
      { code: 'PICK-01', type: 'PICKING' },
      { code: 'SHIP-01', type: 'SHIPPING' },
      { code: 'QC-01', type: 'QUARANTINE' },
    ];

    for (const siteCode of ['GWF', 'PTA']) {
      for (const bin of secondaryBins) {
        await pool.query(`
          INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (tenant_id, warehouse_id, code) DO UPDATE SET bin_type = EXCLUDED.bin_type
        `, [tenantId, warehouseIds[siteCode], bin.code, bin.type, bin.aisle || null, bin.rack || null, bin.level || null]);
      }
      console.log(`Created ${secondaryBins.length} bins for ${siteCode}`);
    }

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
      { reg: 'CJ 123 ABC', make: 'Toyota', model: 'Hilux', capacity: 1000, site: 'K58' },
      { reg: 'CJ 456 DEF', make: 'Isuzu', model: 'NPR 400', capacity: 3500, site: 'K58' },
      { reg: 'GP 789 GHI', make: 'Mercedes', model: 'Sprinter', capacity: 2000, site: 'PTA' },
    ];

    const vehicleIds: Record<string, string> = {};
    for (const v of vehicles) {
      const result = await pool.query(`
        INSERT INTO vehicles (tenant_id, site_id, reg_no, make, model, capacity_kg)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, reg_no) DO UPDATE SET make = EXCLUDED.make
        RETURNING id
      `, [tenantId, siteIds[v.site], v.reg, v.make, v.model, v.capacity]);
      vehicleIds[v.reg] = result.rows[0].id;
    }
    console.log(`Created ${Object.keys(vehicleIds).length} vehicles`);

    // Create drivers
    const drivers = [
      { name: 'Mike Driver', phone: '+27 82 111 2222', license: 'DL123456', site: 'K58' },
      { name: 'Sarah Wheels', phone: '+27 82 333 4444', license: 'DL789012', site: 'K58' },
      { name: 'John Roads', phone: '+27 82 555 6666', license: 'DL345678', site: 'PTA' },
    ];

    const driverIds: string[] = [];
    for (const d of drivers) {
      const result = await pool.query(`
        INSERT INTO drivers (tenant_id, site_id, name, phone, license_no)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [tenantId, siteIds[d.site], d.name, d.phone, d.license]);
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

    // Get supplier IDs
    const supRows = await pool.query(
      `SELECT id, code FROM suppliers WHERE tenant_id = $1`,
      [tenantId]
    );
    const supplierIds: Record<string, string> = {};
    for (const row of supRows.rows) {
      supplierIds[row.code] = row.id;
    }

    console.log('Seeding purchase orders (historical 12 months)...');
    // Purchase orders with historical created_at dates for trending charts
    const purchaseOrders = [
      // 12 months ago
      { no: 'PO-2024-0101', status: 'RECEIVED', supplier: 'SUP001', total: 7360, daysAgo: 365, site: 'K58' },
      { no: 'PO-2024-0102', status: 'RECEIVED', supplier: 'SUP003', total: 5520, daysAgo: 350, site: 'GWF' },
      // 11 months ago
      { no: 'PO-2024-0103', status: 'RECEIVED', supplier: 'SUP002', total: 9775, daysAgo: 330, site: 'K58' },
      // 10 months ago
      { no: 'PO-2024-0104', status: 'RECEIVED', supplier: 'SUP001', total: 10580, daysAgo: 300, site: 'K58' },
      { no: 'PO-2024-0105', status: 'RECEIVED', supplier: 'SUP003', total: 6440, daysAgo: 288, site: 'PTA' },
      // 9 months ago
      { no: 'PO-2024-0106', status: 'RECEIVED', supplier: 'SUP002', total: 12650, daysAgo: 270, site: 'K58' },
      // 8 months ago
      { no: 'PO-2024-0107', status: 'RECEIVED', supplier: 'SUP001', total: 14375, daysAgo: 240, site: 'K58' },
      { no: 'PO-2024-0108', status: 'RECEIVED', supplier: 'SUP003', total: 8970, daysAgo: 225, site: 'GWF' },
      // 7 months ago
      { no: 'PO-2024-0109', status: 'RECEIVED', supplier: 'SUP002', total: 16100, daysAgo: 210, site: 'K58' },
      // 6 months ago
      { no: 'PO-2024-0110', status: 'RECEIVED', supplier: 'SUP001', total: 17825, daysAgo: 180, site: 'K58' },
      { no: 'PO-2024-0111', status: 'RECEIVED', supplier: 'SUP003', total: 9430, daysAgo: 168, site: 'PTA' },
      // 5 months ago
      { no: 'PO-2024-0112', status: 'RECEIVED', supplier: 'SUP002', total: 20700, daysAgo: 150, site: 'K58' },
      // 4 months ago
      { no: 'PO-2024-0113', status: 'RECEIVED', supplier: 'SUP001', total: 23000, daysAgo: 120, site: 'K58' },
      { no: 'PO-2024-0114', status: 'RECEIVED', supplier: 'SUP003', total: 10925, daysAgo: 108, site: 'GWF' },
      // 3 months ago
      { no: 'PO-2024-0115', status: 'RECEIVED', supplier: 'SUP002', total: 25300, daysAgo: 90, site: 'K58' },
      // 2 months ago
      { no: 'PO-2024-0116', status: 'CONFIRMED', supplier: 'SUP001', total: 27600, daysAgo: 60, site: 'K58' },
      { no: 'PO-2024-0117', status: 'PARTIAL', supplier: 'SUP003', total: 12650, daysAgo: 48, site: 'PTA' },
      // 1 month ago
      { no: 'PO-2024-0118', status: 'SENT', supplier: 'SUP002', total: 29900, daysAgo: 25, site: 'K58' },
      { no: 'PO-2024-0119', status: 'CONFIRMED', supplier: 'SUP001', total: 21275, daysAgo: 12, site: 'GWF' },
      // Current
      { no: 'PO-2024-0001', status: 'DRAFT', supplier: 'SUP001', total: 5750, daysAgo: 0, site: 'K58' },
      { no: 'PO-2024-0002', status: 'SENT', supplier: 'SUP002', total: 14375, daysAgo: 5, site: 'K58' },
      { no: 'PO-2024-0003', status: 'CONFIRMED', supplier: 'SUP003', total: 3680, daysAgo: 10, site: 'K58' },
    ];

    for (const po of purchaseOrders) {
      await pool.query(`
        INSERT INTO purchase_orders (tenant_id, site_id, supplier_id, po_no, status, order_date, expected_date,
          ship_to_warehouse_id, subtotal, tax_amount, total_amount, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5,
          CURRENT_DATE - INTERVAL '${po.daysAgo} days',
          CURRENT_DATE - INTERVAL '${Math.max(0, po.daysAgo - 14)} days',
          $6, $7, $8, $9, $10,
          NOW() - INTERVAL '${po.daysAgo} days')
        ON CONFLICT (tenant_id, po_no) DO UPDATE SET
          status = EXCLUDED.status, total_amount = EXCLUDED.total_amount, created_at = EXCLUDED.created_at
      `, [
        tenantId, siteIds[po.site], supplierIds[po.supplier], po.no, po.status,
        warehouseIds[po.site],
        Math.round(po.total / 1.15), Math.round(po.total - po.total / 1.15), po.total,
        userId,
      ]);
    }
    console.log(`Created ${purchaseOrders.length} purchase orders`);

    // PO lines for each purchase order (clear old lines first to avoid duplicates on re-run)
    console.log('Seeding purchase order lines...');
    await pool.query(`DELETE FROM purchase_order_lines WHERE tenant_id = $1`, [tenantId]);
    const poLineSkus = ['WIDGET-001', 'WIDGET-002', 'GADGET-001', 'GADGET-002', 'PART-001', 'CABLE-USB'];
    const poLineData = await pool.query(
      `SELECT id, po_no FROM purchase_orders WHERE tenant_id = $1`,
      [tenantId]
    );
    for (const poRow of poLineData.rows) {
      const skuIdx = Math.abs(poRow.po_no.charCodeAt(poRow.po_no.length - 1)) % poLineSkus.length;
      const sku1 = poLineSkus[skuIdx];
      const sku2 = poLineSkus[(skuIdx + 1) % poLineSkus.length];
      await pool.query(`
        INSERT INTO purchase_order_lines (tenant_id, purchase_order_id, item_id, qty_ordered, qty_received, unit_cost)
        VALUES ($1, $2, $3, 50, 50, 80.00)
        ON CONFLICT DO NOTHING
      `, [tenantId, poRow.id, itemIds[sku1]]);
      await pool.query(`
        INSERT INTO purchase_order_lines (tenant_id, purchase_order_id, item_id, qty_ordered, qty_received, unit_cost)
        VALUES ($1, $2, $3, 100, 100, 40.00)
        ON CONFLICT DO NOTHING
      `, [tenantId, poRow.id, itemIds[sku2]]);
    }
    console.log(`Created PO lines for ${poLineData.rows.length} purchase orders`);

    console.log('Seeding supplier NCRs (12 month trend)...');
    // Supplier NCRs - decreasing trend over 12 months
    const ncrs = [
      // 12 months ago (3 NCRs)
      { no: 'NCR-2024-0001', supplier: 'SUP002', type: 'QUALITY', status: 'CLOSED', daysAgo: 360, desc: 'Batch failed quality inspection - 15% defect rate' },
      { no: 'NCR-2024-0002', supplier: 'SUP001', type: 'DELIVERY', status: 'CLOSED', daysAgo: 355, desc: 'Order delivered 10 days late' },
      { no: 'NCR-2024-0003', supplier: 'SUP003', type: 'DOCUMENTATION', status: 'CLOSED', daysAgo: 348, desc: 'Missing certificates of compliance' },
      // 11 months ago (2 NCRs)
      { no: 'NCR-2024-0004', supplier: 'SUP002', type: 'QUALITY', status: 'CLOSED', daysAgo: 325, desc: 'Loose connectors on cable batch' },
      { no: 'NCR-2024-0005', supplier: 'SUP001', type: 'DELIVERY', status: 'CLOSED', daysAgo: 310, desc: 'Wrong items shipped' },
      // 10 months ago (2 NCRs)
      { no: 'NCR-2024-0006', supplier: 'SUP003', type: 'QUALITY', status: 'CLOSED', daysAgo: 295, desc: 'Dimensions out of spec' },
      { no: 'NCR-2024-0007', supplier: 'SUP002', type: 'OTHER', status: 'CLOSED', daysAgo: 280, desc: 'Failed to provide updated MSDS' },
      // 9 months ago (2 NCRs)
      { no: 'NCR-2024-0008', supplier: 'SUP001', type: 'QUALITY', status: 'CLOSED', daysAgo: 265, desc: 'Cosmetic damage on premium widgets' },
      { no: 'NCR-2024-0009', supplier: 'SUP003', type: 'DELIVERY', status: 'CLOSED', daysAgo: 250, desc: 'Partial shipment without advance notice' },
      // 7 months ago (1 NCR)
      { no: 'NCR-2024-0010', supplier: 'SUP002', type: 'QUALITY', status: 'RESOLVED', daysAgo: 200, desc: 'Faulty power buttons - 8% failure rate' },
      // 6 months ago (1 NCR)
      { no: 'NCR-2024-0011', supplier: 'SUP001', type: 'DOCUMENTATION', status: 'RESOLVED', daysAgo: 175, desc: 'Incorrect packing lists' },
      // 5 months ago (1 NCR)
      { no: 'NCR-2024-0012', supplier: 'SUP003', type: 'DELIVERY', status: 'RESOLVED', daysAgo: 140, desc: 'Delivery to wrong warehouse' },
      // 3 months ago (1 NCR)
      { no: 'NCR-2024-0013', supplier: 'SUP002', type: 'QUALITY', status: 'IN_PROGRESS', daysAgo: 82, desc: 'Overheating during extended use' },
      // 1 month ago (1 NCR)
      { no: 'NCR-2024-0014', supplier: 'SUP001', type: 'DELIVERY', status: 'OPEN', daysAgo: 20, desc: 'Shipment arrived with damaged packaging' },
    ];

    for (const ncr of ncrs) {
      await pool.query(`
        INSERT INTO supplier_ncrs (tenant_id, supplier_id, ncr_no, ncr_type, status, description, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${ncr.daysAgo} days')
        ON CONFLICT (tenant_id, ncr_no) DO UPDATE SET status = EXCLUDED.status, created_at = EXCLUDED.created_at
      `, [tenantId, supplierIds[ncr.supplier], ncr.no, ncr.type, ncr.status, ncr.desc, userId]);
    }
    console.log(`Created ${ncrs.length} supplier NCRs`);

    console.log('Seeding historical sales orders (12 month trend)...');
    // Historical sales orders spread across 12 months for trending charts
    const historicalOrders = [
      // 12 months ago
      { no: 'SO-2024-0101', status: 'DELIVERED', customer: 'CUST001', daysAgo: 365, site: 'K58' },
      { no: 'SO-2024-0102', status: 'DELIVERED', customer: 'CUST003', daysAgo: 353, site: 'GWF' },
      // 11 months ago
      { no: 'SO-2024-0103', status: 'DELIVERED', customer: 'CUST002', daysAgo: 335, site: 'K58' },
      { no: 'SO-2024-0104', status: 'DELIVERED', customer: 'CUST004', daysAgo: 320, site: 'PTA' },
      // 10 months ago
      { no: 'SO-2024-0105', status: 'DELIVERED', customer: 'CUST005', daysAgo: 305, site: 'K58' },
      { no: 'SO-2024-0106', status: 'DELIVERED', customer: 'CUST001', daysAgo: 292, site: 'GWF' },
      // 9 months ago
      { no: 'SO-2024-0107', status: 'DELIVERED', customer: 'CUST003', daysAgo: 275, site: 'K58' },
      { no: 'SO-2024-0108', status: 'DELIVERED', customer: 'CUST002', daysAgo: 260, site: 'K58' },
      // 8 months ago
      { no: 'SO-2024-0109', status: 'DELIVERED', customer: 'CUST004', daysAgo: 245, site: 'PTA' },
      { no: 'SO-2024-0110', status: 'DELIVERED', customer: 'CUST001', daysAgo: 232, site: 'K58' },
      { no: 'SO-2024-0111', status: 'DELIVERED', customer: 'CUST005', daysAgo: 218, site: 'GWF' },
      // 7 months ago
      { no: 'SO-2024-0112', status: 'DELIVERED', customer: 'CUST001', daysAgo: 210, site: 'K58' },
      { no: 'SO-2024-0113', status: 'DELIVERED', customer: 'CUST003', daysAgo: 196, site: 'K58' },
      // 6 months ago
      { no: 'SO-2024-0114', status: 'DELIVERED', customer: 'CUST002', daysAgo: 183, site: 'PTA' },
      { no: 'SO-2024-0115', status: 'DELIVERED', customer: 'CUST004', daysAgo: 170, site: 'K58' },
      { no: 'SO-2024-0116', status: 'DELIVERED', customer: 'CUST001', daysAgo: 158, site: 'GWF' },
      // 5 months ago
      { no: 'SO-2024-0117', status: 'DELIVERED', customer: 'CUST005', daysAgo: 150, site: 'K58' },
      { no: 'SO-2024-0118', status: 'SHIPPED', customer: 'CUST003', daysAgo: 138, site: 'K58' },
      { no: 'SO-2024-0119', status: 'DELIVERED', customer: 'CUST001', daysAgo: 125, site: 'PTA' },
      // 4 months ago
      { no: 'SO-2024-0120', status: 'SHIPPED', customer: 'CUST002', daysAgo: 118, site: 'K58' },
      { no: 'SO-2024-0121', status: 'DELIVERED', customer: 'CUST004', daysAgo: 105, site: 'GWF' },
      { no: 'SO-2024-0122', status: 'SHIPPED', customer: 'CUST001', daysAgo: 93, site: 'K58' },
      // 3 months ago
      { no: 'SO-2024-0123', status: 'SHIPPED', customer: 'CUST005', daysAgo: 85, site: 'K58' },
      { no: 'SO-2024-0124', status: 'DELIVERED', customer: 'CUST003', daysAgo: 72, site: 'PTA' },
      { no: 'SO-2024-0125', status: 'SHIPPED', customer: 'CUST002', daysAgo: 62, site: 'K58' },
      // 2 months ago
      { no: 'SO-2024-0126', status: 'SHIPPED', customer: 'CUST001', daysAgo: 55, site: 'K58' },
      { no: 'SO-2024-0127', status: 'DELIVERED', customer: 'CUST004', daysAgo: 43, site: 'GWF' },
      { no: 'SO-2024-0128', status: 'SHIPPED', customer: 'CUST005', daysAgo: 35, site: 'PTA' },
      // 1 month ago
      { no: 'SO-2024-0129', status: 'CONFIRMED', customer: 'CUST003', daysAgo: 25, site: 'K58' },
      { no: 'SO-2024-0130', status: 'SHIPPED', customer: 'CUST001', daysAgo: 15, site: 'K58' },
      { no: 'SO-2024-0131', status: 'ALLOCATED', customer: 'CUST002', daysAgo: 7, site: 'GWF' },
      { no: 'SO-2024-0132', status: 'PICKING', customer: 'CUST004', daysAgo: 3, site: 'K58' },
    ];

    // Increasing order values over time for an upward trend
    const orderValueMultiplier = [
      7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500,
      11000, 11000, 11500, 12000, 12500, 14000, 14500, 15000,
      15500, 15500, 16000, 17000, 17500, 18000, 19000, 19500,
      20000, 21000, 21500, 22000, 23000, 24000, 24500, 25000,
    ];

    for (let i = 0; i < historicalOrders.length; i++) {
      const order = historicalOrders[i];
      const result = await pool.query(`
        INSERT INTO sales_orders (tenant_id, site_id, warehouse_id, customer_id, order_no, status, priority,
          shipping_address_line1, shipping_city, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'Demo Address', 'Demo City', $8,
          NOW() - INTERVAL '${order.daysAgo} days')
        ON CONFLICT (tenant_id, order_no) DO UPDATE SET
          status = EXCLUDED.status, created_at = EXCLUDED.created_at
        RETURNING id
      `, [
        tenantId, siteIds[order.site], warehouseIds[order.site],
        customerIds[order.customer], order.no, order.status,
        (i % 5) + 1, userId,
      ]);

      const orderId = result.rows[0].id;
      const orderVal = orderValueMultiplier[i] || 15000;
      // Two lines per order
      const qty1 = Math.round(orderVal * 0.6 / 99.99);
      const qty2 = Math.round(orderVal * 0.4 / 49.99);
      const sku1 = poLineSkus[i % poLineSkus.length];
      const sku2 = poLineSkus[(i + 1) % poLineSkus.length];

      await pool.query(`
        INSERT INTO sales_order_lines (tenant_id, sales_order_id, line_no, item_id, qty_ordered, unit_price)
        VALUES ($1, $2, 1, $3, $4, 99.99)
        ON CONFLICT (tenant_id, sales_order_id, line_no) DO NOTHING
      `, [tenantId, orderId, itemIds[sku1], qty1]);
      await pool.query(`
        INSERT INTO sales_order_lines (tenant_id, sales_order_id, line_no, item_id, qty_ordered, unit_price)
        VALUES ($1, $2, 2, $3, $4, 49.99)
        ON CONFLICT (tenant_id, sales_order_id, line_no) DO NOTHING
      `, [tenantId, orderId, itemIds[sku2], qty2]);
    }
    console.log(`Created ${historicalOrders.length} historical sales orders with lines`);

    // Stock for GWF and PTA warehouses
    console.log('Seeding stock for GWF and PTA warehouses...');
    const gwfBins = await pool.query(
      `SELECT id, code FROM bins WHERE tenant_id = $1 AND warehouse_id = $2`,
      [tenantId, warehouseIds['GWF']]
    );
    const ptaBins = await pool.query(
      `SELECT id, code FROM bins WHERE tenant_id = $1 AND warehouse_id = $2`,
      [tenantId, warehouseIds['PTA']]
    );

    const gwfStorageBin = gwfBins.rows.find((b: {code: string}) => b.code === 'A-01-01')?.id;
    const ptaStorageBin = ptaBins.rows.find((b: {code: string}) => b.code === 'A-01-01')?.id;

    if (gwfStorageBin) {
      const gwfStock = [
        { sku: 'WIDGET-001', qty: 80, reserved: 10 },
        { sku: 'WIDGET-002', qty: 40, reserved: 5 },
        { sku: 'GADGET-001', qty: 120, reserved: 15 },
        { sku: 'GADGET-002', qty: 30, reserved: 5 },
      ];
      for (const s of gwfStock) {
        await pool.query(`
          INSERT INTO stock_snapshot (tenant_id, bin_id, item_id, batch_no, qty_on_hand, qty_reserved)
          VALUES ($1, $2, $3, '', $4, $5)
          ON CONFLICT (tenant_id, bin_id, item_id, batch_no) DO UPDATE SET
            qty_on_hand = EXCLUDED.qty_on_hand, qty_reserved = EXCLUDED.qty_reserved
        `, [tenantId, gwfStorageBin, itemIds[s.sku], s.qty, s.reserved]);
      }
      console.log('Added GWF warehouse stock');
    }

    if (ptaStorageBin) {
      const ptaStock = [
        { sku: 'WIDGET-001', qty: 60, reserved: 8 },
        { sku: 'PART-001', qty: 300, reserved: 20 },
        { sku: 'CABLE-USB', qty: 400, reserved: 30 },
        { sku: 'CABLE-HDMI', qty: 200, reserved: 15 },
      ];
      for (const s of ptaStock) {
        await pool.query(`
          INSERT INTO stock_snapshot (tenant_id, bin_id, item_id, batch_no, qty_on_hand, qty_reserved)
          VALUES ($1, $2, $3, '', $4, $5)
          ON CONFLICT (tenant_id, bin_id, item_id, batch_no) DO UPDATE SET
            qty_on_hand = EXCLUDED.qty_on_hand, qty_reserved = EXCLUDED.qty_reserved
        `, [tenantId, ptaStorageBin, itemIds[s.sku], s.qty, s.reserved]);
      }
      console.log('Added PTA warehouse stock');
    }

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
        (SELECT COUNT(*) FROM purchase_orders WHERE tenant_id = $1) as purchase_orders,
        (SELECT COUNT(*) FROM supplier_ncrs WHERE tenant_id = $1) as ncrs,
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
