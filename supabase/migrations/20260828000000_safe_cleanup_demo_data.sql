-- Safe Cleanup Script for Production Database
-- Removes hardcoded mock/demo merchant (glam-studio) and all associated test data safely

DO $$
DECLARE
    demo_merchant_id UUID;
BEGIN
    -- 1. Find the glam-studio demo merchant if it exists
    SELECT id INTO demo_merchant_id FROM public.merchants WHERE slug = 'glam-studio';

    IF demo_merchant_id IS NOT NULL THEN
        -- Delete test bookings
        DELETE FROM public.bookings WHERE merchant_id = demo_merchant_id;
        
        -- Delete test blocked slots
        DELETE FROM public.slots WHERE merchant_id = demo_merchant_id;
        
        -- Delete test staff services mapping
        DELETE FROM public.staff_services WHERE staff_id IN (SELECT id FROM public.staff WHERE merchant_id = demo_merchant_id);
        
        -- Delete test staff
        DELETE FROM public.staff WHERE merchant_id = demo_merchant_id;
        
        -- Delete test services
        DELETE FROM public.services WHERE merchant_id = demo_merchant_id;
        
        -- Delete test branches
        DELETE FROM public.branches WHERE merchant_id = demo_merchant_id;
        
        -- Finally delete the demo merchant
        DELETE FROM public.merchants WHERE id = demo_merchant_id;
        
        RAISE NOTICE 'Demo merchant (glam-studio) and all its data have been successfully deleted from production database.';
    ELSE
        RAISE NOTICE 'Demo merchant (glam-studio) does not exist in the database.';
    END IF;
END $$;
