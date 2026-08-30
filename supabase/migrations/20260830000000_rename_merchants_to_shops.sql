-- ==============================================================================
-- Migration: Rename merchants table to shops & merchant_id columns to shop_id
-- ==============================================================================

-- 1. Rename table merchants -> shops
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'merchants') THEN
        ALTER TABLE public.merchants RENAME TO shops;
    END IF;
END $$;

-- 2. Rename foreign key columns (merchant_id -> shop_id) in dependent tables
DO $$
BEGIN
    -- branches
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'branches' AND column_name = 'merchant_id') THEN
        ALTER TABLE public.branches RENAME COLUMN merchant_id TO shop_id;
    END IF;

    -- staff
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'merchant_id') THEN
        ALTER TABLE public.staff RENAME COLUMN merchant_id TO shop_id;
    END IF;

    -- services
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'merchant_id') THEN
        ALTER TABLE public.services RENAME COLUMN merchant_id TO shop_id;
    END IF;

    -- slots
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'slots' AND column_name = 'merchant_id') THEN
        ALTER TABLE public.slots RENAME COLUMN merchant_id TO shop_id;
    END IF;

    -- bookings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'merchant_id') THEN
        ALTER TABLE public.bookings RENAME COLUMN merchant_id TO shop_id;
    END IF;
END $$;

-- 3. Update Indexes
DROP INDEX IF EXISTS public.idx_merchants_slug;
CREATE INDEX IF NOT EXISTS idx_shops_slug ON public.shops(slug);

DROP INDEX IF EXISTS public.idx_branches_merchant;
CREATE INDEX IF NOT EXISTS idx_branches_shop ON public.branches(shop_id);

DROP INDEX IF EXISTS public.idx_staff_merchant;
CREATE INDEX IF NOT EXISTS idx_staff_shop ON public.staff(shop_id);

DROP INDEX IF EXISTS public.idx_services_merchant;
CREATE INDEX IF NOT EXISTS idx_services_shop ON public.services(shop_id);

DROP INDEX IF EXISTS public.idx_slots_merchant_time;
CREATE INDEX IF NOT EXISTS idx_slots_shop_time ON public.slots(shop_id, start_time, end_time);

DROP INDEX IF EXISTS public.idx_bookings_merchant_time;
CREATE INDEX IF NOT EXISTS idx_bookings_shop_time ON public.bookings(shop_id, start_time, end_time);

-- 4. Permissions for shops table
GRANT ALL ON TABLE public.shops TO anon, authenticated, service_role;

-- 5. Row Level Security Policies for shops
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read merchants" ON public.shops;
DROP POLICY IF EXISTS "Public insert merchants (onboarding)" ON public.shops;
DROP POLICY IF EXISTS "Public update merchants" ON public.shops;
DROP POLICY IF EXISTS "Public read shops" ON public.shops;
DROP POLICY IF EXISTS "Public insert shops" ON public.shops;
DROP POLICY IF EXISTS "Public update shops" ON public.shops;

CREATE POLICY "Public read shops" ON public.shops FOR SELECT USING (true);
CREATE POLICY "Public insert shops" ON public.shops FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update shops" ON public.shops FOR UPDATE USING (true);
