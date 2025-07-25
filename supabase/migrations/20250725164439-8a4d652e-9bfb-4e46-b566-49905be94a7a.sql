-- Create enum for user ranks
CREATE TYPE public.user_rank AS ENUM (
  'acolyte',
  'apprentice', 
  'journeyman',
  'adept',
  'artificer',
  'magister',
  'arch_forgemaster',
  'forgemaster',
  'forgelord'
);

-- Create user ranks table
CREATE TABLE public.user_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet text NOT NULL UNIQUE,
  current_rank public.user_rank NOT NULL DEFAULT 'acolyte',
  rank_level integer NOT NULL DEFAULT 1,
  achieved_at timestamp with time zone NOT NULL DEFAULT now(),
  total_volume_traded numeric DEFAULT 0,
  total_trades integer DEFAULT 0,
  tokens_created integer DEFAULT 0,
  tokens_graduated integer DEFAULT 0,
  show_title boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view user ranks" 
ON public.user_ranks 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own rank display settings" 
ON public.user_ranks 
FOR UPDATE 
USING (user_wallet IN (
  SELECT wallet_address FROM profiles WHERE wallet_address = user_ranks.user_wallet
));

CREATE POLICY "System can insert and update user ranks" 
ON public.user_ranks 
FOR ALL 
USING (true);

-- Function to get rank info
CREATE OR REPLACE FUNCTION public.get_rank_info(p_rank public.user_rank)
RETURNS TABLE(
  rank_name text,
  rank_level integer,
  theme_line text,
  rank_color text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE p_rank
      WHEN 'acolyte' THEN 'Acolyte'
      WHEN 'apprentice' THEN 'Apprentice'
      WHEN 'journeyman' THEN 'Journeyman'
      WHEN 'adept' THEN 'Adept'
      WHEN 'artificer' THEN 'Artificer'
      WHEN 'magister' THEN 'Magister'
      WHEN 'arch_forgemaster' THEN 'Arch-Forgemaster'
      WHEN 'forgemaster' THEN 'Forgemaster'
      WHEN 'forgelord' THEN 'Forgelord'
    END::text,
    CASE p_rank
      WHEN 'acolyte' THEN 1
      WHEN 'apprentice' THEN 2
      WHEN 'journeyman' THEN 3
      WHEN 'adept' THEN 4
      WHEN 'artificer' THEN 5
      WHEN 'magister' THEN 6
      WHEN 'arch_forgemaster' THEN 7
      WHEN 'forgemaster' THEN 8
      WHEN 'forgelord' THEN 9
    END::integer,
    CASE p_rank
      WHEN 'acolyte' THEN 'The spark awaits the hammer.'
      WHEN 'apprentice' THEN 'First strike on the anvil.'
      WHEN 'journeyman' THEN 'Steel meets moonfire.'
      WHEN 'adept' THEN 'Tempered in orbit.'
      WHEN 'artificer' THEN 'Shapes gravity at will.'
      WHEN 'magister' THEN 'Commands the lunar furnace.'
      WHEN 'arch_forgemaster' THEN 'Turns markets to molten ore.'
      WHEN 'forgemaster' THEN 'Keeps the Foundry''s core burning.'
      WHEN 'forgelord' THEN 'Writes the laws of fire.'
    END::text,
    CASE p_rank
      WHEN 'acolyte' THEN '#6B7280'
      WHEN 'apprentice' THEN '#10B981'
      WHEN 'journeyman' THEN '#3B82F6'
      WHEN 'adept' THEN '#8B5CF6'
      WHEN 'artificer' THEN '#F59E0B'
      WHEN 'magister' THEN '#EF4444'
      WHEN 'arch_forgemaster' THEN '#EC4899'
      WHEN 'forgemaster' THEN '#DC2626'
      WHEN 'forgelord' THEN '#B91C1C'
    END::text;
END;
$$;

-- Function to calculate and update user rank
CREATE OR REPLACE FUNCTION public.calculate_user_rank(p_user_wallet text)
RETURNS public.user_rank
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_volume numeric;
  user_trades integer;
  user_tokens integer;
  user_graduated integer;
  new_rank public.user_rank;
BEGIN
  -- Get user stats from various tables
  SELECT 
    COALESCE(SUM(ta.amount_sol), 0),
    COUNT(ta.id),
    COUNT(DISTINCT t.id),
    COUNT(CASE WHEN t.is_graduated THEN 1 END)
  INTO user_volume, user_trades, user_tokens, user_graduated
  FROM trading_activities ta
  LEFT JOIN tokens t ON t.creator_wallet = p_user_wallet
  WHERE ta.user_wallet = p_user_wallet;

  -- Calculate rank based on criteria
  IF user_volume >= 1000000 OR user_graduated >= 1 THEN
    new_rank := 'arch_forgemaster';
  ELSIF user_volume >= 100000 OR (user_tokens >= 1 AND EXISTS(SELECT 1 FROM tokens WHERE creator_wallet = p_user_wallet AND market_cap >= 100000)) THEN
    new_rank := 'magister';
  ELSIF user_volume >= 10000 OR user_trades >= 100 OR (user_tokens >= 1 AND EXISTS(SELECT 1 FROM tokens WHERE creator_wallet = p_user_wallet AND market_cap >= 75000)) THEN
    new_rank := 'artificer';
  ELSIF user_volume >= 2500 OR user_trades >= 25 OR (user_tokens >= 5 AND EXISTS(SELECT 1 FROM tokens WHERE creator_wallet = p_user_wallet AND holder_count >= 100)) THEN
    new_rank := 'adept';
  ELSIF user_volume >= 250 OR user_trades >= 5 OR user_tokens >= 2 THEN
    new_rank := 'journeyman';
  ELSIF user_trades >= 1 OR user_tokens >= 1 THEN
    new_rank := 'apprentice';
  ELSE
    new_rank := 'acolyte';
  END IF;

  -- Insert or update user rank
  INSERT INTO public.user_ranks (
    user_wallet, 
    current_rank, 
    rank_level,
    total_volume_traded,
    total_trades,
    tokens_created,
    tokens_graduated
  )
  VALUES (
    p_user_wallet,
    new_rank,
    (SELECT rank_level FROM public.get_rank_info(new_rank)),
    user_volume,
    user_trades,
    user_tokens,
    user_graduated
  )
  ON CONFLICT (user_wallet) 
  DO UPDATE SET
    current_rank = new_rank,
    rank_level = (SELECT rank_level FROM public.get_rank_info(new_rank)),
    total_volume_traded = user_volume,
    total_trades = user_trades,
    tokens_created = user_tokens,
    tokens_graduated = user_graduated,
    updated_at = now();

  RETURN new_rank;
END;
$$;

-- Set the founder rank
INSERT INTO public.user_ranks (user_wallet, current_rank, rank_level, show_title)
VALUES ('DZm7tfhk7di4GG7XhSXzHJu5dduB4o91paKHQgcvNSAF', 'forgelord', 9, true)
ON CONFLICT (user_wallet) 
DO UPDATE SET current_rank = 'forgelord', rank_level = 9;