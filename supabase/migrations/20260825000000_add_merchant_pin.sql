-- Add admin_pin column to merchants table for secure dashboard access
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS admin_pin TEXT DEFAULT '1234';

-- Update demo merchant PIN
UPDATE public.merchants 
SET admin_pin = '1234'
WHERE slug = 'glam-studio';
