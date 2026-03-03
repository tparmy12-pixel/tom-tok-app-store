
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create apps table
CREATE TABLE public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  size TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  icon_url TEXT,
  apk_url TEXT,
  screenshots TEXT[] DEFAULT '{}',
  download_count INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 4.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

-- 5. Create downloads tracking table
CREATE TABLE public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- 6. Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON public.apps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );

  -- Auto-assign admin role for specific email
  IF NEW.email = 'alvibrahim29@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Increment download count function
CREATE OR REPLACE FUNCTION public.increment_download_count(_app_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.apps SET download_count = download_count + 1 WHERE id = _app_id;
END;
$$;

-- 10. RLS Policies

-- Profiles: users read all, update own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles: users can read own, admins read all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Apps: everyone reads, admins write
CREATE POLICY "Anyone can view apps" ON public.apps FOR SELECT USING (true);
CREATE POLICY "Admins can insert apps" ON public.apps FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update apps" ON public.apps FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete apps" ON public.apps FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Downloads: authenticated users insert, admins read all, users read own
CREATE POLICY "Users can insert downloads" ON public.downloads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own downloads" ON public.downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all downloads" ON public.downloads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 11. Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('apks', 'apks', true, 524288000);
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('app-assets', 'app-assets', true, 10485760);

-- Storage policies for apks
CREATE POLICY "Anyone can download APKs" ON storage.objects FOR SELECT USING (bucket_id = 'apks');
CREATE POLICY "Admins can upload APKs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'apks' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update APKs" ON storage.objects FOR UPDATE USING (bucket_id = 'apks' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete APKs" ON storage.objects FOR DELETE USING (bucket_id = 'apks' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for app-assets (icons, screenshots)
CREATE POLICY "Anyone can view app assets" ON storage.objects FOR SELECT USING (bucket_id = 'app-assets');
CREATE POLICY "Admins can upload app assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'app-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update app assets" ON storage.objects FOR UPDATE USING (bucket_id = 'app-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete app assets" ON storage.objects FOR DELETE USING (bucket_id = 'app-assets' AND public.has_role(auth.uid(), 'admin'));
