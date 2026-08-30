-- ==============================================================================
-- Q Flow Full Schema Migration (Tables, RLS, Storage, Permissions, Demo Data)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Shops Table (Formerly merchants)
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    phone TEXT,
    promptpay_id TEXT NOT NULL,
    promptpay_name TEXT,
    default_deposit NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    open_time TIME NOT NULL DEFAULT '10:00:00',
    close_time TIME NOT NULL DEFAULT '20:00:00',
    has_break BOOLEAN NOT NULL DEFAULT true,
    break_start_time TIME DEFAULT '12:00:00',
    break_end_time TIME DEFAULT '13:00:00',
    closed_days INT[] DEFAULT '{}',
    branch_name TEXT DEFAULT 'สาขาหลัก (Main Branch)',
    branch_address TEXT,
    branch_phone TEXT,
    slot_interval_min INT NOT NULL DEFAULT 30,
    line_user_id TEXT,
    line_notify_token TEXT,
    admin_pin TEXT DEFAULT '1234',
    plan VARCHAR(50) NOT NULL DEFAULT 'growth',
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    monthly_slip_quota INT NOT NULL DEFAULT 1500,
    used_slips_this_month INT NOT NULL DEFAULT 0,
    current_period_end TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    promptpay_id TEXT,
    promptpay_name TEXT,
    open_time TIME DEFAULT '10:00:00',
    close_time TIME DEFAULT '20:00:00',
    has_break BOOLEAN DEFAULT true,
    break_start_time TIME DEFAULT '12:00:00',
    break_end_time TIME DEFAULT '13:00:00',
    closed_days INT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Staff Table
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    nickname TEXT,
    role_title TEXT DEFAULT 'ช่างผู้ให้บริการ',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    duration_min INT NOT NULL DEFAULT 60,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    deposit_amount NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Staff Services Table
CREATE TABLE IF NOT EXISTS public.staff_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    price_override NUMERIC(10, 2),
    duration_override INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(staff_id, service_id)
);

-- 6. Blocked Slots / Schedules Table
CREATE TABLE IF NOT EXISTS public.slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason TEXT,
    is_blocked BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Bookings Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE public.booking_status AS ENUM ('pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_line_id TEXT,
    customer_notes TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status public.booking_status NOT NULL DEFAULT 'pending_payment',
    slip_url TEXT,
    slip_trans_ref TEXT,
    slip_verified_at TIMESTAMPTZ,
    slip_raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_shops_slug ON public.shops(slug);
CREATE INDEX IF NOT EXISTS idx_branches_shop ON public.branches(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_shop ON public.staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_branch ON public.staff(branch_id);
CREATE INDEX IF NOT EXISTS idx_services_shop ON public.services(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_staff ON public.staff_services(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service ON public.staff_services(service_id);
CREATE INDEX IF NOT EXISTS idx_slots_shop_time ON public.slots(shop_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_shop_time ON public.bookings(shop_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_branch ON public.bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON public.bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_slip_trans_ref ON public.bookings(slip_trans_ref) WHERE slip_trans_ref IS NOT NULL;

-- 9. Grant Permissions to API Roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.shops TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.branches TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.staff TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.services TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.staff_services TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.slots TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bookings TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- 10. Row Level Security (RLS)
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read shops" ON public.shops;
DROP POLICY IF EXISTS "Public insert shops" ON public.shops;
DROP POLICY IF EXISTS "Public update shops" ON public.shops;
CREATE POLICY "Public read shops" ON public.shops FOR SELECT USING (true);
CREATE POLICY "Public insert shops" ON public.shops FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update shops" ON public.shops FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public read branches" ON public.branches;
DROP POLICY IF EXISTS "Public write branches" ON public.branches;
CREATE POLICY "Public read branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Public write branches" ON public.branches FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read staff" ON public.staff;
DROP POLICY IF EXISTS "Public write staff" ON public.staff;
CREATE POLICY "Public read staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Public write staff" ON public.staff FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read active services" ON public.services;
DROP POLICY IF EXISTS "Public manage services" ON public.services;
CREATE POLICY "Public read active services" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Public manage services" ON public.services FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read staff_services" ON public.staff_services;
DROP POLICY IF EXISTS "Public write staff_services" ON public.staff_services;
CREATE POLICY "Public read staff_services" ON public.staff_services FOR SELECT USING (true);
CREATE POLICY "Public write staff_services" ON public.staff_services FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read slots" ON public.slots;
DROP POLICY IF EXISTS "Public manage slots" ON public.slots;
CREATE POLICY "Public read slots" ON public.slots FOR SELECT USING (true);
CREATE POLICY "Public manage slots" ON public.slots FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public update bookings" ON public.bookings;
CREATE POLICY "Public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Public create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update bookings" ON public.bookings FOR UPDATE USING (true);

-- 11. Storage Bucket for Slips
INSERT INTO storage.buckets (id, name, public) 
VALUES ('slips', 'slips', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public slip upload" ON storage.objects;
DROP POLICY IF EXISTS "Public slip read" ON storage.objects;
CREATE POLICY "Public slip upload" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'slips');
CREATE POLICY "Public slip read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'slips');
