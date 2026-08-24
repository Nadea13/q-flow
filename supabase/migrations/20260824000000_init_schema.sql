-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Merchants Table
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    promptpay_id TEXT NOT NULL,
    promptpay_name TEXT,
    default_deposit NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    open_time TIME NOT NULL DEFAULT '10:00:00',
    close_time TIME NOT NULL DEFAULT '20:00:00',
    slot_interval_min INT NOT NULL DEFAULT 30,
    line_user_id TEXT,
    line_notify_token TEXT,
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
    deposit_amount NUMERIC(10, 2), -- If null, use merchant default_deposit
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
CREATE TYPE public.booking_status AS ENUM ('pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show');

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
    slip_trans_ref TEXT, -- Unique bank transaction reference to prevent reuse
    slip_verified_at TIMESTAMPTZ,
    slip_raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_merchants_slug ON public.merchants(slug);
CREATE INDEX IF NOT EXISTS idx_services_merchant ON public.services(merchant_id);
CREATE INDEX IF NOT EXISTS idx_slots_merchant_time ON public.slots(merchant_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_merchant_time ON public.bookings(merchant_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_slip_trans_ref ON public.bookings(slip_trans_ref) WHERE slip_trans_ref IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Public read access policies for booking pages
CREATE POLICY "Public read merchants" ON public.merchants FOR SELECT USING (true);
CREATE POLICY "Public insert merchants (onboarding)" ON public.merchants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update merchants" ON public.merchants FOR UPDATE USING (true);

CREATE POLICY "Public read active services" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Public manage services" ON public.services FOR ALL USING (true);

CREATE POLICY "Public read slots" ON public.slots FOR SELECT USING (true);
CREATE POLICY "Public manage slots" ON public.slots FOR ALL USING (true);

CREATE POLICY "Public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Public create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update bookings" ON public.bookings FOR UPDATE USING (true);

-- Seed Demo Data
INSERT INTO public.merchants (id, slug, name, phone, promptpay_id, promptpay_name, default_deposit, open_time, close_time, slot_interval_min)
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
    30
) ON CONFLICT (slug) DO NOTHING;

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
