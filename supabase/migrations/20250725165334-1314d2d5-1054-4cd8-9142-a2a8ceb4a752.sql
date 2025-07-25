-- Fix the calculate_user_rank function to preserve founder/admin ranks
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
  current_rank_level integer;
  founder_wallet text := 'DZm7tfhk7di4GG7XhSXzHJu5dduB4o91paKHQgcvNSAF';
BEGIN
  -- Check if this is the founder/admin - preserve their rank
  IF p_user_wallet = founder_wallet THEN
    -- Update stats but keep rank as forgelord
    SELECT 
      COALESCE(SUM(ta.amount_sol), 0),
      COUNT(ta.id),
      COUNT(DISTINCT t.id),
      COUNT(CASE WHEN t.is_graduated THEN 1 END)
    INTO user_volume, user_trades, user_tokens, user_graduated
    FROM trading_activities ta
    LEFT JOIN tokens t ON t.creator_wallet = p_user_wallet
    WHERE ta.user_wallet = p_user_wallet;

    -- Update stats but preserve forgelord rank
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
      'forgelord',
      9,
      user_volume,
      user_trades,
      user_tokens,
      user_graduated
    )
    ON CONFLICT (user_wallet) 
    DO UPDATE SET
      total_volume_traded = user_volume,
      total_trades = user_trades,
      tokens_created = user_tokens,
      tokens_graduated = user_graduated,
      updated_at = now();

    RETURN 'forgelord'::public.user_rank;
  END IF;

  -- Get current rank level to prevent rank decrease for high-level users
  SELECT rank_level INTO current_rank_level
  FROM public.user_ranks
  WHERE user_wallet = p_user_wallet;

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

  -- Don't allow rank decrease for users at forgemaster level or higher (rank level 8+)
  IF current_rank_level IS NOT NULL AND current_rank_level >= 8 THEN
    -- Keep their current rank if calculated rank would be lower
    SELECT current_rank INTO new_rank
    FROM public.user_ranks
    WHERE user_wallet = p_user_wallet;
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

-- Reset founder rank to forgelord
UPDATE public.user_ranks 
SET current_rank = 'forgelord', rank_level = 9, updated_at = now()
WHERE user_wallet = 'DZm7tfhk7di4GG7XhSXzHJu5dduB4o91paKHQgcvNSAF';