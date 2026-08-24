-- Grant schema usage to API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table permissions to anon, authenticated, service_role
GRANT ALL ON TABLE public.merchants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.services TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.slots TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bookings TO anon, authenticated, service_role;

-- Grant sequence permissions if any
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Grant default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
