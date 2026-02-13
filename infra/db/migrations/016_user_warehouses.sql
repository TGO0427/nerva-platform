-- User-warehouse access (optional per-warehouse restriction)
CREATE TABLE IF NOT EXISTS user_warehouses (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, warehouse_id)
);
