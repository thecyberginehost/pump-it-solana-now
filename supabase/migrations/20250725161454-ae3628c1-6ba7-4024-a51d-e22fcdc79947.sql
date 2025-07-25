-- Add announcements category that only admin can post in
INSERT INTO public.forum_categories (id, name, description, icon, color, sort_order, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Announcements',
  'Official platform announcements and updates',
  '📢',
  '#DC2626',
  0,
  now(),
  now()
);

-- Add admin-only posting restriction column to forum_categories
ALTER TABLE public.forum_categories 
ADD COLUMN admin_only_posting boolean DEFAULT false;

-- Mark announcements category as admin-only
UPDATE public.forum_categories 
SET admin_only_posting = true 
WHERE name = 'Announcements';

-- Create function to check if user can post in category
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
  admin_wallet text := 'your_wallet_address_here'; -- Replace with actual admin wallet
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