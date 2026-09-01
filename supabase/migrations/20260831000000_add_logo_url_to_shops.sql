-- Add logo_url column to shops table
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';