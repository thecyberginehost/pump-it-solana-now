-- Purge all token-related data to start fresh
-- Delete in order to respect foreign key constraints

-- Delete user portfolios
DELETE FROM public.user_portfolios;

-- Delete trading activities  
DELETE FROM public.trading_activities;

-- Delete creator earnings
DELETE FROM public.creator_earnings;

-- Delete user achievements (only those tied to specific tokens)
DELETE FROM public.user_achievements WHERE token_id IS NOT NULL;

-- Delete trending boosts
DELETE FROM public.trending_boosts;

-- Delete community rewards
DELETE FROM public.community_rewards;

-- Delete fee transactions
DELETE FROM public.fee_transactions;

-- Finally delete all tokens
DELETE FROM public.tokens;

-- Reset creator credits to default for all users
UPDATE public.creator_credits 
SET daily_credits = 30, 
    last_reset = now(),
    updated_at = now();