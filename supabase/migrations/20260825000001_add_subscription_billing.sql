-- Add Subscription and Billing columns to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) NOT NULL DEFAULT 'growth',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS monthly_slip_quota INT NOT NULL DEFAULT 500,
ADD COLUMN IF NOT EXISTS used_slips_this_month INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Update demo merchant
UPDATE public.merchants 
SET plan = 'growth',
    subscription_status = 'active',
    monthly_slip_quota = 500,
    used_slips_this_month = 18
WHERE slug = 'glam-studio';
