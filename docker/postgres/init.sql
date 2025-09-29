-- SpringCart Postgres initialization script
-- Schema: categories, products
-- Seeds initial data for development and demo purposes.
--
-- Idempotent: tables are created if missing; seed inserts use ON CONFLICT DO NOTHING.
-- Safe to run on a fresh database volume (recommended via docker-entrypoint-initdb.d/).

BEGIN;

-- Ensure we operate in the 'public' schema
SET search_path TO public;

-- -----------------------------------------------------------------------------
-- Utility trigger function to maintain updated_at timestamp on row updates
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Table: categories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id           BIGSERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS ix_categories_name ON categories (name);

-- Trigger to auto-update updated_at on update
DROP TRIGGER IF EXISTS trg_categories_set_updated_at ON categories;
CREATE TRIGGER trg_categories_set_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Table: products
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                   BIGSERIAL PRIMARY KEY,
  name                 VARCHAR(255) NOT NULL,
  description          TEXT,
  price                NUMERIC(15,2) NOT NULL CHECK (price >= 0),
  image_url            TEXT,
  total_items_in_stock INTEGER NOT NULL DEFAULT 0 CHECK (total_items_in_stock >= 0),
  category_id          BIGINT REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX IF NOT EXISTS ix_products_name        ON products (name);
CREATE INDEX IF NOT EXISTS ix_products_category_id ON products (category_id);

-- Trigger to auto-update updated_at on update
DROP TRIGGER IF EXISTS trg_products_set_updated_at ON products;
CREATE TRIGGER trg_products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Seed data
-- -----------------------------------------------------------------------------

-- Categories
-- Explicit IDs assigned for reproducibility
INSERT INTO categories (id, name, created_at, updated_at) VALUES
  (1, 'Food',        NOW(), NOW()),
  (2, 'Mobiles',     NOW(), NOW()),
  (3, 'Electronics', NOW(), NOW()),
  (4, 'Stationery',  NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Keep sequence in sync after manual ID inserts
SELECT
  setval(
    pg_get_serial_sequence('categories', 'id'),
    COALESCE((SELECT MAX(id) FROM categories), 1),
    TRUE
  );

-- Products
-- Sample data per requirements:
-- ID | Name   | Category    | Price  | Total Items in Stock
-- 1  | Cake   | Food        | 200    | 10
-- 2  | Phone  | Mobiles     | 20000  | 100
-- 3  | Laptop | Electronics | 400000 | 20
-- 4  | Book   | Stationery  | 50     | 3
INSERT INTO products (id, name, description, price, image_url, total_items_in_stock, category_id, created_at, updated_at) VALUES
  (1, 'Cake',   'Delicious fresh cake.',                      200.00,    'https://picsum.photos/id/100/600/600', 10, 1, NOW(), NOW()),
  (2, 'Phone',  'Latest smartphone with great features.',   20000.00,    'https://picsum.photos/id/101/600/600',100, 2, NOW(), NOW()),
  (3, 'Laptop', 'High-performance laptop for professionals.',400000.00,  'https://picsum.photos/id/102/600/600', 20, 3, NOW(), NOW()),
  (4, 'Book',   'Bestselling paperback.',                        50.00,   'https://picsum.photos/id/103/600/600',  3, 4, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Keep sequence in sync after manual ID inserts
SELECT
  setval(
    pg_get_serial_sequence('products', 'id'),
    COALESCE((SELECT MAX(id) FROM products), 1),
    TRUE
  );

COMMIT;

-- -----------------------------------------------------------------------------
-- Verification (optional): Uncomment to quickly check totals after container starts
-- -----------------------------------------------------------------------------
-- SELECT COUNT(*) AS total_products FROM products;
-- SELECT name AS category, COUNT(*) AS products_in_category FROM categories c
--   LEFT JOIN products p ON p.category_id = c.id
--   GROUP BY c.name ORDER BY c.name;
-- SELECT SUM(price * total_items_in_stock) AS total_inventory_value FROM products;
-- SELECT SUM(total_items_in_stock) AS total_items_in_stock FROM products;
