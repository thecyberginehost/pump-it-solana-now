-- Add fields to profiles table to support admin accounts
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_type text DEFAULT 'wallet',
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Add unique constraint on email where not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique 
ON public.profiles(email) WHERE email IS NOT NULL;

-- Function to generate next admin username
CREATE OR REPLACE FUNCTION public.generate_admin_username(rank_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  next_number integer;
  username text;
BEGIN
  -- Get the highest number for this rank type
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(username FROM rank_type || '(\d+)') 
        AS integer
      )
    ), 0
  ) + 1
  INTO next_number
  FROM public.profiles
  WHERE username ~ ('^' || rank_type || '\d+$')
    AND is_admin = true;
  
  -- Format with leading zero if needed
  username := rank_type || LPAD(next_number::text, 2, '0');
  
  RETURN username;
END;
$$;

-- Function to create admin profile
CREATE OR REPLACE FUNCTION public.create_admin_profile(
  p_user_id uuid,
  p_email text,
  p_rank_type text DEFAULT 'Forgemaster'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_username text;
  admin_rank public.user_rank;
BEGIN
  -- Generate username
  admin_username := public.generate_admin_username(p_rank_type);
  
  -- Set rank based on type
  IF p_rank_type = 'Forgelord' THEN
    admin_rank := 'forgelord';
  ELSE
    admin_rank := 'forgemaster';
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (
    wallet_address,
    username,
    email,
    auth_type,
    is_admin,
    created_at,
    last_active
  ) VALUES (
    p_user_id::text, -- Use user_id as wallet_address for admins
    admin_username,
    p_email,
    'email',
    true,
    now(),
    now()
  );
  
  -- Create user rank
  INSERT INTO public.user_ranks (
    user_wallet,
    current_rank,
    rank_level,
    show_title
  ) VALUES (
    p_user_id::text,
    admin_rank,
    CASE WHEN admin_rank = 'forgelord' THEN 9 ELSE 8 END,
    false -- Don't show rank title since username IS the rank
  );
  
  RETURN admin_username;
END;
$$;

-- Update RLS policies to support admin accounts
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (
  -- Wallet users: wallet_address matches current user
  (auth_type = 'wallet' AND wallet_address = (SELECT auth.uid()::text))
  OR
  -- Email users: wallet_address matches auth.uid for admin accounts
  (auth_type = 'email' AND wallet_address = auth.uid()::text AND is_admin = true)
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (
  -- Wallet users: wallet_address matches current user  
  (auth_type = 'wallet' AND wallet_address = (SELECT auth.uid()::text))
  OR
  -- Email users: wallet_address matches auth.uid for admin accounts
  (auth_type = 'email' AND wallet_address = auth.uid()::text AND is_admin = true)
);

-- Function to handle admin user creation (trigger function)
CREATE OR REPLACE FUNCTION public.handle_admin_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_username text;
BEGIN
  -- Only process if this is marked as an admin signup
  IF NEW.raw_user_meta_data->>'is_admin' = 'true' THEN
    -- Create admin profile
    admin_username := public.create_admin_profile(
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'rank_type', 'Forgemaster')
    );
    
    -- Log the creation
    INSERT INTO public.platform_access_logs (
      user_wallet,
      action,
      signature_hash,
      timestamp
    ) VALUES (
      NEW.id::text,
      'admin_account_created',
      admin_username,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for admin user signup
DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
CREATE TRIGGER on_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_user_signup();