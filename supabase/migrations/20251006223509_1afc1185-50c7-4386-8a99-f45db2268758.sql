-- Create enums for roles and status
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.property_status AS ENUM ('active', 'inactive');
CREATE TYPE public.delete_reason AS ENUM ('sold', 'no_longer_managing', 'merged_with_other_property', 'other');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'declined', 'property_inactive', 'already_tenant');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_roles table (CRITICAL: separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(title) >= 1 AND length(title) <= 100),
  address TEXT,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  status property_status DEFAULT 'active' NOT NULL,
  deleted_at TIMESTAMPTZ,
  delete_reason delete_reason,
  manager_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_modified_by UUID REFERENCES auth.users(id),
  modification_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create property_tenants junction table (many-to-many)
CREATE TABLE public.property_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(property_id, tenant_id)
);

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  status invitation_status DEFAULT 'pending' NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(email, property_id)
);

-- Create indexes
CREATE INDEX idx_properties_manager_id ON public.properties(manager_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_property_tenants_property_id ON public.property_tenants(property_id);
CREATE INDEX idx_property_tenants_tenant_id ON public.property_tenants(tenant_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for properties
CREATE POLICY "Managers can view their own properties"
  ON public.properties FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Tenants can view assigned properties"
  ON public.properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_tenants
      WHERE property_id = id AND tenant_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all properties"
  ON public.properties FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create properties"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update their active properties"
  ON public.properties FOR UPDATE
  USING (auth.uid() = manager_id AND status = 'active');

CREATE POLICY "Admins can update any property"
  ON public.properties FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can delete their properties"
  ON public.properties FOR DELETE
  USING (auth.uid() = manager_id);

CREATE POLICY "Admins can delete any property"
  ON public.properties FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for property_tenants
CREATE POLICY "Anyone can view their tenant relationships"
  ON public.property_tenants FOR SELECT
  USING (
    auth.uid() IN (
      SELECT manager_id FROM public.properties WHERE id = property_id
    ) OR
    auth.uid() = tenant_id OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Managers can add tenants to their active properties"
  ON public.property_tenants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id
        AND manager_id = auth.uid()
        AND status = 'active'
    ) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Managers can remove tenants from their properties"
  ON public.property_tenants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND manager_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for invitations
CREATE POLICY "Users can view invitations sent to their email"
  ON public.invitations FOR SELECT
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND manager_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Managers can create invitations for their active properties"
  ON public.invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id
        AND manager_id = auth.uid()
        AND status = 'active'
    ) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can update invitations sent to them"
  ON public.invitations FOR UPDATE
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND manager_id = auth.uid()
    ) OR
    public.has_role(auth.uid(), 'admin')
  );