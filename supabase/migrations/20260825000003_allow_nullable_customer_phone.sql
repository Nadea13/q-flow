-- ==============================================================================
-- Allow Nullable Phone for Manual / Walk-in Bookings
-- ==============================================================================

ALTER TABLE public.bookings ALTER COLUMN customer_phone DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN customer_phone SET DEFAULT '-';
