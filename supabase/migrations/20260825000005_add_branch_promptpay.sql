-- Migration: Add promptpay_id and promptpay_name to branches table for per-branch payment accounts
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS promptpay_id TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS promptpay_name TEXT;
