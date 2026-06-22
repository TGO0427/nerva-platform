-- Align the existing demo customers with the food-industry seed data.
UPDATE customers AS customer
SET name = names.name
FROM tenants AS tenant,
  (VALUES
    ('CUST001', 'Cape Harvest Foods'),
    ('CUST002', 'Ubuntu Dairy Products'),
    ('CUST003', 'Golden Grain Bakeries'),
    ('CUST004', 'Karoo Meat Processors'),
    ('CUST005', 'Coastal Fresh Produce')
  ) AS names(code, name)
WHERE customer.tenant_id = tenant.id
  AND tenant.code = 'DEMO'
  AND customer.code = names.code;
