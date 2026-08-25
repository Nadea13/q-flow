-- Migration: Add branches, staff, and staff_services tables
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
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

CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    nickname TEXT,
    role_title TEXT DEFAULT 'ช่างผู้ให้บริการ',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.staff_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    price_override NUMERIC(10, 2),
    duration_override INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(staff_id, service_id)
);

-- Add branch_id and staff_id to bookings table if not present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='branch_id') THEN
        ALTER TABLE public.bookings ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='staff_id') THEN
        ALTER TABLE public.bookings ADD COLUMN staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

-- Public RLS Policies
DROP POLICY IF EXISTS "Public read branches" ON public.branches;
CREATE POLICY "Public read branches" ON public.branches FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public write branches" ON public.branches;
CREATE POLICY "Public write branches" ON public.branches FOR ALL TO public USING (true);

DROP POLICY IF EXISTS "Public read staff" ON public.staff;
CREATE POLICY "Public read staff" ON public.staff FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public write staff" ON public.staff;
CREATE POLICY "Public write staff" ON public.staff FOR ALL TO public USING (true);

DROP POLICY IF EXISTS "Public read staff_services" ON public.staff_services;
CREATE POLICY "Public read staff_services" ON public.staff_services FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Public write staff_services" ON public.staff_services;
CREATE POLICY "Public write staff_services" ON public.staff_services FOR ALL TO public USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_branches_merchant ON public.branches(merchant_id);
CREATE INDEX IF NOT EXISTS idx_staff_merchant ON public.staff(merchant_id);
CREATE INDEX IF NOT EXISTS idx_staff_branch ON public.staff(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_staff ON public.staff_services(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service ON public.staff_services(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_branch ON public.bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON public.bookings(staff_id);
