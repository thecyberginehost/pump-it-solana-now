-- Update the generate_admin_username function to handle Forgelord as a single entity
CREATE OR REPLACE FUNCTION public.generate_admin_username(rank_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_number integer;
  username text;
BEGIN
  -- Special case for Forgelord - there's only one
  IF rank_type = 'Forgelord' THEN
    RETURN 'Forgelord';
  END IF;
  
  -- For Forgemaster, keep the automated numbering
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
$function$;

-- Update create_admin_profile function to handle the special Forgelord case
CREATE OR REPLACE FUNCTION public.create_admin_profile(p_user_id uuid, p_email text, p_rank_type text DEFAULT 'Forgemaster'::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_username text;
  admin_rank public.user_rank;
BEGIN
  -- Check if Forgelord already exists
  IF p_rank_type = 'Forgelord' THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE username = 'Forgelord' AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Forgelord already exists. There can only be one Forgelord.';
    END IF;
  END IF;
  
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
$function$;