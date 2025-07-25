-- Create function to check if user can reply to a post (checks if post is in admin-only category)
CREATE OR REPLACE FUNCTION public.can_reply_to_post(
  p_user_wallet text,
  p_post_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  post_category_id uuid;
  is_admin_only boolean;
  admin_wallet text := 'DZm7tfhk7di4GG7XhSXzHJu5dduB4o91paKHQgcvNSAF';
BEGIN
  -- Get the category of the post being replied to
  SELECT category_id INTO post_category_id
  FROM public.forum_posts
  WHERE id = p_post_id;
  
  -- Get category admin restriction
  SELECT admin_only_posting INTO is_admin_only
  FROM public.forum_categories
  WHERE id = post_category_id;
  
  -- If not admin-only category, anyone can reply
  IF NOT is_admin_only THEN
    RETURN true;
  END IF;
  
  -- If admin-only category, only admin can reply
  RETURN p_user_wallet = admin_wallet;
END;
$$;

-- Update RLS policy on forum_replies to restrict replies to admin-only posts
DROP POLICY IF EXISTS "Users can create forum replies" ON public.forum_replies;

CREATE POLICY "Users can create forum replies" 
ON public.forum_replies 
FOR INSERT 
WITH CHECK (
  -- Check if user can reply to this specific post
  public.can_reply_to_post(user_wallet, post_id)
);