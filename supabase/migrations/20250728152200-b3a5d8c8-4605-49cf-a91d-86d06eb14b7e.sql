-- Add dev_mode column to tokens table for tracking devnet vs production tokens
ALTER TABLE public.tokens ADD COLUMN dev_mode BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.tokens.dev_mode IS 'Indicates if token was created in development/testing mode';