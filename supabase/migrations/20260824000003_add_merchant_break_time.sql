-- Add break time columns to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS has_break BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS break_start_time TIME DEFAULT '12:00:00',
ADD COLUMN IF NOT EXISTS break_end_time TIME DEFAULT '13:00:00';

-- Update demo merchant
UPDATE public.merchants 
SET has_break = true,
    break_start_time = '12:00:00',
    break_end_time = '13:00:00'
WHERE slug = 'glam-studio';
