-- Create banned_wallets table for admin user management
CREATE TABLE public.banned_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address text NOT NULL UNIQUE,
  banned_by text NOT NULL, -- Admin who banned them
  ban_reason text,
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  is_permanent boolean DEFAULT true,
  unban_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banned_wallets ENABLE ROW LEVEL SECURITY;

-- Only admins can manage banned wallets
CREATE POLICY "Admins can manage banned wallets"
ON public.banned_wallets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE wallet_address = (auth.uid())::text 
    AND is_admin = true
  )
);

-- Create function to check if wallet is banned
CREATE OR REPLACE FUNCTION public.is_wallet_banned(p_wallet_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.banned_wallets
    WHERE wallet_address = p_wallet_address
    AND (
      is_permanent = true 
      OR (is_permanent = false AND unban_at > now())
    )
  );
END;
$function$;

-- Add trigger for updated_at
CREATE TRIGGER update_banned_wallets_updated_at
BEFORE UPDATE ON public.banned_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();