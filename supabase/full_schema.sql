-- ==============================================================================
-- QFlow Full Schema Migration (Tables, RLS, Storage, Permissions, Demo Data)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Merchants Table
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    promptpay_id TEXT NOT NULL,
    promptpay_name TEXT,
    default_deposit NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    open_time TIME NOT NULL DEFAULT '10:00:00',
    close_time TIME NOT NULL DEFAULT '20:00:00',
    has_break BOOLEAN NOT NULL DEFAULT true,
    break_start_time TIME DEFAULT '12:00:00',
    break_end_time TIME DEFAULT '13:00:00',
    slot_interval_min INT NOT NULL DEFAULT 30,
    line_user_id TEXT,
    line_notify_token TEXT,
    admin_pin TEXT DEFAULT '1234',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
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

-- 3. Blocked Slots / Schedules Table
CREATE TABLE IF NOT EXISTS public.slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason TEXT,
    is_blocked BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Bookings Table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE public.booking_status AS ENUM ('pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
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

-- 5. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_merchants_slug ON public.merchants(slug);
CREATE INDEX IF NOT EXISTS idx_services_merchant ON public.services(merchant_id);
CREATE INDEX IF NOT EXISTS idx_slots_merchant_time ON public.slots(merchant_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_merchant_time ON public.bookings(merchant_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_slip_trans_ref ON public.bookings(slip_trans_ref) WHERE slip_trans_ref IS NOT NULL;

-- 6. Grant Permissions to API Roles (Postgres 17 Compatibility)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.merchants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.services TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.slots TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bookings TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- 7. Row Level Security (RLS)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read merchants" ON public.merchants;
DROP POLICY IF EXISTS "Public insert merchants (onboarding)" ON public.merchants;
DROP POLICY IF EXISTS "Public update merchants" ON public.merchants;
CREATE POLICY "Public read merchants" ON public.merchants FOR SELECT USING (true);
CREATE POLICY "Public insert merchants (onboarding)" ON public.merchants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update merchants" ON public.merchants FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public read active services" ON public.services;
DROP POLICY IF EXISTS "Public manage services" ON public.services;
CREATE POLICY "Public read active services" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Public manage services" ON public.services FOR ALL USING (true);

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

-- 8. Storage Bucket for Slips
INSERT INTO storage.buckets (id, name, public) 
VALUES ('slips', 'slips', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public slip upload" ON storage.objects;
DROP POLICY IF EXISTS "Public slip read" ON storage.objects;
CREATE POLICY "Public slip upload" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'slips');
CREATE POLICY "Public slip read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'slips');

-- 9. Seed Demo Data (Glam Studio)
INSERT INTO public.merchants (id, slug, name, phone, promptpay_id, promptpay_name, default_deposit, open_time, close_time, has_break, break_start_time, break_end_time, slot_interval_min, admin_pin)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'glam-studio',
    'Glam Studio & Spa',
    '0812345678',
    '0812345678',
    'Glam Studio Co., Ltd.',
    200.00,
    '10:00:00',
    '20:00:00',
    true,
    '12:00:00',
    '13:00:00',
    30,
    '1234'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    promptpay_id = EXCLUDED.promptpay_id,
    has_break = EXCLUDED.has_break,
    break_start_time = EXCLUDED.break_start_time,
    break_end_time = EXCLUDED.break_end_time;

INSERT INTO public.services (merchant_id, title, description, duration_min, price, deposit_amount, is_active, sort_order)
VALUES 
(
    'a0000000-0000-0000-0000-000000000001',
    'ต่อขนตา Classic เส้นต่อเส้น',
    'ลุคธรรมชาติ สวยเบาสบายตา ไม่หนักหนังตา (60 นาที)',
    60,
    890.00,
    200.00,
    true,
    1
),
(
    'a0000000-0000-0000-0000-000000000001',
    'ต่อขนตา Volume จับช่อ',
    'ลุคฟูแน่น ตาหวานฉ่ำ สวยสะกด (90 นาที)',
    90,
    1290.00,
    300.00,
    true,
    2
),
(
    'a0000000-0000-0000-0000-000000000001',
    'ทำเล็บเจล มือ-เท้า + สปาพรีเมียม',
    'ตัดแต่งทรงเล็บ ขัดส้นเท้า พอกสปา ทาสีเจลไม่จำกัดสี (90 นาที)',
    90,
    990.00,
    200.00,
    true,
    3
) ON CONFLICT DO NOTHING;
