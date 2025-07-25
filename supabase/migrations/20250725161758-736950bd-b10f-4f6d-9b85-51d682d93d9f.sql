-- Update the admin wallet address in the can_post_in_category function
CREATE OR REPLACE FUNCTION public.can_post_in_category(
  p_user_wallet text,
  p_category_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_admin_only boolean;
  admin_wallet text := 'DZm7tfhk7di4GG7XhSXzHJu5dduB4o91paKHQgcvNSAF';
BEGIN
  -- Get category admin restriction
  SELECT admin_only_posting INTO is_admin_only
  FROM public.forum_categories
  WHERE id = p_category_id;
  
  -- If not admin-only category, anyone can post
  IF NOT is_admin_only THEN
    RETURN true;
  END IF;
  
  -- Check if user is admin
  RETURN p_user_wallet = admin_wallet;
END;
$$;