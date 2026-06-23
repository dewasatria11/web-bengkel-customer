-- EXTENSION
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- CLEAN STORAGE POLICY (BIAR GA ERROR)
-- =========================
DROP POLICY IF EXISTS "qris_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "qris_images_anon_upload" ON storage.objects;
DROP POLICY IF EXISTS "qris_images_anon_update" ON storage.objects;

-- =========================
-- STORE PROFILE
-- =========================
CREATE TABLE IF NOT EXISTS public.store_profile (
    id          INT PRIMARY KEY DEFAULT 1,
    name        TEXT NOT NULL DEFAULT 'EGA GARAGE',
    address     TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    qris_image_url TEXT DEFAULT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'store_profile_single_row'
    ) THEN
        ALTER TABLE public.store_profile
        ADD CONSTRAINT store_profile_single_row CHECK (id = 1);
    END IF;
END $$;

INSERT INTO public.store_profile (id, name, address, phone)
VALUES (1, 'EGA GARAGE', 'Alamat Bengkel', '08xxxxxxxxxx')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.store_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_profile_read_all" ON public.store_profile;
CREATE POLICY "store_profile_read_all" ON public.store_profile
FOR SELECT USING (true);

DROP POLICY IF EXISTS "store_profile_write_service" ON public.store_profile;
CREATE POLICY "store_profile_write_service" ON public.store_profile
FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "store_profile_update_anon" ON public.store_profile;
CREATE POLICY "store_profile_update_anon" ON public.store_profile
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "store_profile_insert_anon" ON public.store_profile;
CREATE POLICY "store_profile_insert_anon" ON public.store_profile
FOR INSERT WITH CHECK (true);


-- =========================
-- PRODUCTS
-- =========================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INT NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    image_url TEXT DEFAULT NULL,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_read_all" ON public.products;
CREATE POLICY "products_read_all" ON public.products
FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_write_anon" ON public.products;
CREATE POLICY "products_write_anon" ON public.products
FOR ALL USING (true);


-- =========================
-- SERVICES
-- =========================
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price INT NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_read_all" ON public.services;
CREATE POLICY "services_read_all" ON public.services
FOR SELECT USING (true);

DROP POLICY IF EXISTS "services_write_anon" ON public.services;
CREATE POLICY "services_write_anon" ON public.services
FOR ALL USING (true);


-- =========================
-- CUSTOMERS
-- =========================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    no_telepon TEXT NOT NULL UNIQUE,
    jenis_motor TEXT NOT NULL CHECK (jenis_motor IN ('matic', 'gigi', 'kopling')),
    merk_motor TEXT NOT NULL,
    plat_nomor TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customers_no_telepon_idx 
ON public.customers (no_telepon);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_read_all" ON public.customers;
CREATE POLICY "customers_read_all" ON public.customers
FOR SELECT USING (true);

DROP POLICY IF EXISTS "customers_insert_anon" ON public.customers;
CREATE POLICY "customers_insert_anon" ON public.customers
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "customers_update_anon" ON public.customers;
CREATE POLICY "customers_update_anon" ON public.customers
FOR UPDATE USING (true);


-- =========================
-- WEB ORDERS
-- =========================
CREATE TABLE IF NOT EXISTS public.web_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_motor TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('service', 'product', 'mixed')),
    items JSONB NOT NULL DEFAULT '[]',
    total INT NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'qris')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'done', 'cancelled')),
    is_read_by_admin BOOLEAN DEFAULT FALSE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS web_orders_unread_idx 
ON public.web_orders (is_read_by_admin, created_at DESC);

CREATE INDEX IF NOT EXISTS web_orders_status_idx 
ON public.web_orders (status, created_at DESC);

ALTER TABLE public.web_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "web_orders_read_all" ON public.web_orders;
CREATE POLICY "web_orders_read_all" ON public.web_orders
FOR SELECT USING (true);

DROP POLICY IF EXISTS "web_orders_insert_anon" ON public.web_orders;
CREATE POLICY "web_orders_insert_anon" ON public.web_orders
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "web_orders_update_anon" ON public.web_orders;
CREATE POLICY "web_orders_update_anon" ON public.web_orders
FOR UPDATE USING (true);


-- =========================
-- TRIGGER
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS web_orders_updated_at ON public.web_orders;

CREATE TRIGGER web_orders_updated_at
BEFORE UPDATE ON public.web_orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =========================
-- STORAGE
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('qris-images', 'qris-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "qris_images_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'qris-images');

CREATE POLICY "qris_images_anon_upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'qris-images');

CREATE POLICY "qris_images_anon_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'qris-images');

-- Product Images Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_anon_upload" ON storage.objects;
CREATE POLICY "product_images_anon_upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_anon_update" ON storage.objects;
CREATE POLICY "product_images_anon_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'product-images');
