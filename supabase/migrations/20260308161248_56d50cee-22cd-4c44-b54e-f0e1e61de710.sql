
-- Admin settings table for configurable values like payment amount
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view settings" ON public.admin_settings
FOR SELECT TO authenticated USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert settings" ON public.admin_settings
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings" ON public.admin_settings
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Insert default payment amount
INSERT INTO public.admin_settings (key, value) VALUES ('promotion_price', '100');

-- Promotion requests table
CREATE TABLE public.promotion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_link text NOT NULL,
  button_text text NOT NULL DEFAULT 'Install',
  button_style text NOT NULL DEFAULT 'gradient',
  description text,
  transaction_id text NOT NULL,
  amount numeric NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

ALTER TABLE public.promotion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests" ON public.promotion_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can insert requests" ON public.promotion_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests" ON public.promotion_requests
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests" ON public.promotion_requests
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
