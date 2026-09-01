-- ==============================================================================
-- Migration: Ensure all columns for shops, branches, staff, services exist
-- ==============================================================================

-- 1. Ensure columns on shops table
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) NOT NULL DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS monthly_slip_quota INT NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS used_slips_this_month INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- 2. Ensure columns on branches table
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

ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS promptpay_id TEXT,
ADD COLUMN IF NOT EXISTS promptpay_name TEXT;

-- 3. Ensure staff and staff_services tables exist
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

CREATE TABLE IF NOT EXISTS public.staff_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    price_override NUMERIC(10, 2),
    duration_override INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(staff_id, service_id)
);
