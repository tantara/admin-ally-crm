CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
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

-- First registered user becomes admin, everyone else a regular user
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE TYPE public.waitlist_status AS ENUM ('pending', 'invited', 'approved', 'rejected');

CREATE TABLE public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  company text,
  status public.waitlist_status NOT NULL DEFAULT 'pending',
  source text,
  notes text,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX waitlist_entries_email_key ON public.waitlist_entries (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_entries TO authenticated;
GRANT ALL ON public.waitlist_entries TO service_role;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view waitlist"
ON public.waitlist_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert waitlist"
ON public.waitlist_entries FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update waitlist"
ON public.waitlist_entries FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete waitlist"
ON public.waitlist_entries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER waitlist_entries_updated_at
BEFORE UPDATE ON public.waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.waitlist_entries (name, email, company, status, source, notes, priority) VALUES
('Ada Lovelace', 'ada@analytical.io', 'Analytical Engines', 'approved', 'Referral', 'Early design partner.', 3),
('Grace Hopper', 'grace@navycompute.mil', 'Navy Compute', 'invited', 'Twitter', 'Asked about API access.', 2),
('Alan Turing', 'alan@bletchley.uk', 'Bletchley Labs', 'pending', 'Landing page', NULL, 1),
('Katherine Johnson', 'katherine@orbit.space', 'Orbit', 'pending', 'Product Hunt', 'Wants team seats.', 0),
('Linus Torvalds', 'linus@kernel.dev', 'Kernel Inc', 'rejected', 'Cold inbound', 'Out of scope for now.', 0),
('Margaret Hamilton', 'margaret@apollo.dev', 'Apollo Software', 'pending', 'Newsletter', NULL, 2);