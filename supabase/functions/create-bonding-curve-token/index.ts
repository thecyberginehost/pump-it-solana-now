import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  log('INFO', `[${requestId}] Starting token creation request`);

  try {
    log('INFO', `[${requestId}] Request method: ${req.method}`);
    
    if (req.method !== "POST") {
      log('ERROR', `[${requestId}] Invalid method: ${req.method}`);
      return jsonResponse({ error: "Use POST method" }, 405);
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
      log('INFO', `[${requestId}] Request body parsed successfully`);
      log('DEBUG', `[${requestId}] Request body`, { 
        name: body.name, 
        symbol: body.symbol, 
        hasImage: !!body.imageUrl,
        creatorWallet: body.creatorWallet?.slice(0, 8) + '...' // Log partial wallet for privacy
      });
    } catch (parseError) {
      log('ERROR', `[${requestId}] Failed to parse JSON body`, { error: parseError.message });
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { name, symbol, creatorWallet, description, imageUrl, telegram, twitter, initialBuyIn } = body;
    
    if (!name || !symbol || !creatorWallet) {
      log('ERROR', `[${requestId}] Missing required fields`, { 
        hasName: !!name, 
        hasSymbol: !!symbol, 
        hasCreatorWallet: !!creatorWallet 
      });
      return jsonResponse({ error: "name, symbol, and creatorWallet required" }, 400);
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    const platformKey = Deno.env.get("PLATFORM_WALLET_PRIVATE_KEY");

    log('INFO', `[${requestId}] Environment check`, {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      heliusKey: !!heliusKey,
      platformKey: !!platformKey,
    });

    if (!supabaseUrl || !supabaseKey || !heliusKey || !platformKey) {
      log('ERROR', `[${requestId}] Missing critical environment variables`);
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    // Initialize Supabase client
    log('INFO', `[${requestId}] Initializing Supabase client`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Create token in database first
    const tokenId = crypto.randomUUID();
    const mintAddress = `devnet-mint-${Date.now()}`;
    
    log('INFO', `[${requestId}] Creating token record in database`, { tokenId, mintAddress });
    
    try {
      const { data: tokenRecord, error: dbError } = await supabase
        .from('tokens')
        .insert({
          id: tokenId,
          name,
          symbol,
          description: description || `${name} - A new token created with Moonforge`,
          image_url: imageUrl,
          telegram_url: telegram,
          x_url: twitter,
          creator_wallet: creatorWallet,
          mint_address: mintAddress,
          market_cap: 1000, // Starting market cap
          holder_count: 1,
          volume_24h: 0,
          is_graduated: false,
          sol_raised: 0,
          tokens_remaining: 800000000, // 800M tokens remaining
          tokens_sold: 200000000, // 200M initial tokens sold
          total_supply: 1000000000, // 1B total supply
          dev_mode: true // Mark as devnet token
        })
        .select()
        .single();

      if (dbError) {
        log('ERROR', `[${requestId}] Database insert failed`, { 
          error: dbError.message, 
          code: dbError.code,
          details: dbError.details 
        });
        return jsonResponse({ 
          error: `Database error: ${dbError.message}`,
          requestId 
        }, 500);
      }

      log('SUCCESS', `[${requestId}] Token record created successfully`, { tokenId });

      // Step 2: Simulate Solana devnet token creation (for now, we'll just log what would happen)
      log('INFO', `[${requestId}] Simulating Solana devnet token creation`);
      
      // Here we would normally:
      // 1. Create the SPL token mint
      // 2. Set up bonding curve account
      // 3. Create initial liquidity
      // 4. Return transaction for user to sign
      
      log('INFO', `[${requestId}] Solana operations would include:`, {
        steps: [
          "Create SPL token mint account",
          "Initialize token metadata", 
          "Set up bonding curve PDA",
          "Create initial token supply",
          "Set mint/freeze authority to bonding curve"
        ]
      });

      // For devnet testing, we'll return a success but note that blockchain integration is pending
      const response = {
        success: true,
        message: "Token created successfully in database (devnet mode)",
        token: {
          id: tokenId,
          name,
          symbol,
          creator_wallet: creatorWallet,
          mint_address: mintAddress,
          created_at: new Date().toISOString(),
        },
        environmentStatus: {
          supabaseUrl: true,
          supabaseKey: true,
          heliusKey: true,
          platformKey: true,
        },
        devMode: true,
        requiresSignature: false, // Will be true when we implement actual Solana integration
        requestId
      };

      log('SUCCESS', `[${requestId}] Token creation completed successfully`, { tokenId });
      return jsonResponse(response);

    } catch (dbError) {
      log('ERROR', `[${requestId}] Unexpected database error`, { error: dbError.message, stack: dbError.stack });
      return jsonResponse({ 
        error: `Unexpected database error: ${dbError.message}`,
        requestId 
      }, 500);
    }

  } catch (err: any) {
    log('ERROR', `[${requestId}] Unexpected error in token creation`, { 
      message: err?.message,
      name: err?.name,
      stack: err?.stack 
    });
    
    return jsonResponse({
      error: err?.message ?? "Unknown error occurred",
      errorName: err?.name,
      requestId,
      timestamp: new Date().toISOString()
    }, 500);
  }
});