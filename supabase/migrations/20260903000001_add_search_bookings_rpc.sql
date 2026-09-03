-- Migration: Add search_bookings function to allow searching by phone or short booking ID
CREATE OR REPLACE FUNCTION search_bookings(p_shop_id uuid, p_query text)
RETURNS SETOF bookings
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM bookings
  WHERE (shop_id = p_shop_id OR p_shop_id IS NULL)
    AND (
      customer_phone ILIKE '%' || p_query || '%'
      OR id::text ILIKE p_query || '%'
      OR id::text ILIKE '%' || p_query || '%'
    )
  ORDER BY start_time DESC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION search_bookings(uuid, text) TO anon, authenticated, service_role;
