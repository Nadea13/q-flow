-- Create public storage bucket for slips
INSERT INTO storage.buckets (id, name, public) 
VALUES ('slips', 'slips', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow anyone to upload slips
CREATE POLICY "Public slip upload" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'slips');

-- Policy to allow public to view slips
CREATE POLICY "Public slip read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'slips');
