-- Add closed_days and branch info columns to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS closed_days INT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS branch_name TEXT DEFAULT 'สาขาหลัก (Main Branch)',
ADD COLUMN IF NOT EXISTS branch_address TEXT,
ADD COLUMN IF NOT EXISTS branch_phone TEXT;

-- Update demo merchant (Glam Studio: closed on Monday [1], branch main)
UPDATE public.merchants 
SET closed_days = '{1}',
    branch_name = 'สาขา สยามสแควร์ (Main Branch)',
    branch_address = 'สยามสแควร์ ซอย 3 เขตปทุมวัน กรุงเทพฯ 10330',
    branch_phone = '0812345678'
WHERE slug = 'glam-studio';
