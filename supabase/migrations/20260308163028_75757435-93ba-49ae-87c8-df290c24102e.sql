
-- Add video_url column to promotion_requests
ALTER TABLE public.promotion_requests ADD COLUMN video_url text;

-- Create storage bucket for promotion videos
INSERT INTO storage.buckets (id, name, public) VALUES ('promotion-videos', 'promotion-videos', true);

-- Allow authenticated users to upload videos
CREATE POLICY "Users can upload promotion videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'promotion-videos');

-- Allow public to view promotion videos
CREATE POLICY "Anyone can view promotion videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'promotion-videos');

-- Allow users to delete their own promotion videos
CREATE POLICY "Users can delete own promotion videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'promotion-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
