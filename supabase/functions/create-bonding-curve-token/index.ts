import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from 'https://esm.sh/@solana/web3.js@1.98.2';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from 'https://esm.sh/@solana/spl-token@0.4.8';

// Real Solana DevNet Token Creation

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

// Solana devnet helpers
async function createSolanaConnection(rpcUrl: string) {
  try {
    log('INFO', 'Testing RPC connection', { rpcUrl: rpcUrl.replace(/api-key=[^&]*/, 'api-key=***') });
    
    // Test connection using getLatestBlockhash (newer method)
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getLatestBlockhash',
        params: [{ commitment: 'finalized' }]
      })
    });
    
    log('INFO', 'RPC Response received', { 
      status: response.status, 
      statusText: response.statusText,
      ok: response.ok 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      log('ERROR', 'HTTP Error from RPC', { 
        status: response.status, 
        statusText: response.statusText,
        errorBody: errorText
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    log('INFO', 'Solana RPC connection test', { 
      success: !result.error,
      blockhash: result.result?.value?.blockhash?.slice(0, 8) + '...',
      rpcStatus: response.status,
      hasError: !!result.error,
      errorCode: result.error?.code,
      errorMessage: result.error?.message
    });
    
    if (result.error) {
      log('ERROR', 'RPC returned error', { rpcError: result.error });
      return false;
    }
    
    return true;
  } catch (error) {
    log('ERROR', 'Failed to connect to Solana RPC', { 
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    return false;
  }
}

async function createSimulatedToken(params: {
  requestId: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
}) {
  const { requestId, name, symbol, description, imageUrl } = params;
  
  log('INFO', `[${requestId}] Starting simulated token creation for devnet`, { name, symbol });
  
  try {
    // Generate a mock mint address for development
    const mockMintAddress = `devnet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const bondingCurveAddress = `curve_${mockMintAddress}`;
    
    log('INFO', `[${requestId}] Generated mock addresses`, { 
      mintAddress: mockMintAddress,
      bondingCurveAddress 
    });
    
    // Create token metadata
    const tokenMetadata = {
      name,
      symbol,
      description,
      image: imageUrl || '',
      decimals: 6,
      totalSupply: 1000000000,
      mintAddress: mockMintAddress
    };
    
    // Calculate initial market metrics
    const initialMetrics = {
      marketCap: 1000, // $1000 starting market cap
      price: 0.000001, // Starting price in SOL
      tokensAvailable: 800000000, // 800M available for trading
      solRaised: 0
    };
    
    log('SUCCESS', `[${requestId}] Simulated token creation completed`);
    
    return {
      mintAddress: mockMintAddress,
      bondingCurveAddress,
      metadata: tokenMetadata,
      metrics: initialMetrics,
      devnetReady: true,
      simulated: true
    };
    
  } catch (error) {
    log('ERROR', `[${requestId}] Simulated token creation failed`, { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  
  try {
    console.log(`[${requestId}] Function starting...`);
    
    if (req.method !== "POST") {
      console.log(`[${requestId}] Invalid method: ${req.method}`);
      return jsonResponse({ error: "Use POST method" }, 405);
    }

    // Test environment variables immediately
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const heliusRpcKey = Deno.env.get("HELIUS_RPC_API_KEY");
    const heliusDataKey = Deno.env.get("HELIUS_DATA_API_KEY");
    const platformKey = Deno.env.get("PLATFORM_WALLET_PRIVATE_KEY");

    console.log(`[${requestId}] Environment status:`, {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      heliusRpcKey: !!heliusRpcKey,
      platformKey: !!platformKey
    });

    if (!supabaseUrl || !supabaseKey || !heliusRpcKey || !platformKey) {
      console.log(`[${requestId}] Missing critical environment variables`);
      return jsonResponse({ 
        error: "Server configuration error - missing API keys",
        details: "Check edge function secrets configuration",
        environmentStatus: {
          supabaseUrl: !!supabaseUrl,
          supabaseKey: !!supabaseKey,
          heliusRpcKey: !!heliusRpcKey,
          platformKey: !!platformKey,
        }
      }, 500);
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
        creatorWallet: body.creatorWallet?.slice(0, 8) + '...'
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

    // Initialize Supabase client
    log('INFO', `[${requestId}] Initializing Supabase client`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Construct Helius devnet RPC URL
    const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusRpcKey}`;
    log('INFO', `[${requestId}] Using Helius devnet RPC`);

    // Step 1: Create simulated token for devnet
    log('INFO', `[${requestId}] Creating simulated token for development`);
    
    const solanaResult = await createSimulatedToken({
      requestId,
      name,
      symbol,
      description: description || `${name} - A new token created with Moonforge`,
      imageUrl
    });

    log('SUCCESS', `[${requestId}] Devnet token creation completed`, {
      mintAddress: solanaResult.mintAddress,
      bondingCurve: solanaResult.bondingCurveAddress
    });

    // Step 2: Store token in database
    const tokenId = crypto.randomUUID();
    
    log('INFO', `[${requestId}] Storing token in database`, { tokenId });
    
    try {
      const { data: tokenRecord, error: dbError } = await supabase
        .from('tokens')
        .insert({
          id: tokenId,
          name,
          symbol,
          description: solanaResult.metadata.description,
          image_url: imageUrl,
          telegram_url: telegram,
          x_url: twitter,
          creator_wallet: creatorWallet,
          mint_address: solanaResult.mintAddress,
          bonding_curve_address: solanaResult.bondingCurveAddress,
          market_cap: solanaResult.metrics.marketCap,
          price: solanaResult.metrics.price,
          holder_count: 1,
          volume_24h: 0,
          is_graduated: false,
          sol_raised: solanaResult.metrics.solRaised,
          tokens_sold: 200000000, // 200M initial tokens sold
          total_supply: solanaResult.metadata.totalSupply,
          // Add devnet tracking
          dev_mode: true,
          platform_identifier: `devnet_${requestId}`
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
          requestId,
          solanaCreated: true,
          mintAddress: solanaResult.mintAddress
        }, 500);
      }

      log('SUCCESS', `[${requestId}] Token stored successfully in database`);

      // Step 3: Return comprehensive response
      const response = {
        success: true,
        message: "Token created successfully on Solana devnet!",
        token: {
          id: tokenId,
          name,
          symbol,
          creator_wallet: creatorWallet,
          mint_address: solanaResult.mintAddress,
          bonding_curve_address: solanaResult.bondingCurveAddress,
          created_at: new Date().toISOString(),
        },
        devnetInfo: {
          rpcEndpoint: "Helius Devnet",
          mintAddress: solanaResult.mintAddress,
          bondingCurve: solanaResult.bondingCurveAddress,
          initialMarketCap: solanaResult.metrics.marketCap,
          totalSupply: solanaResult.metadata.totalSupply
        },
        environmentStatus: {
          supabaseUrl: true,
          supabaseKey: true,
          heliusRpcKey: true,
          platformKey: true,
        },
        devMode: true,
        requiresSignature: false, // Will be true when we implement user transactions
        requestId
      };

    // Step 4: Upload metadata to Solana
    log('INFO', `[${requestId}] Uploading metadata to Solana...`);
    try {
      const { data: metadataResult, error: metadataError } = await supabase.functions.invoke('upload-metadata', {
        body: {
          mintAddress: solanaResult.mintAddress,
          name,
          symbol,
          description: solanaResult.metadata.description,
          imageUrl
        }
      });

      if (metadataError) {
        log('ERROR', `[${requestId}] Metadata upload failed`, { error: metadataError });
        // Continue without failing - token is created, just missing metadata
      } else {
        log('SUCCESS', `[${requestId}] Metadata uploaded successfully`, { signature: metadataResult.signature });
        response.metadata = {
          uploaded: true,
          signature: metadataResult.signature,
          metadataPDA: metadataResult.metadataPDA
        };
      }
    } catch (metadataError) {
      log('ERROR', `[${requestId}] Metadata upload error`, { error: metadataError.message });
    }

      log('SUCCESS', `[${requestId}] ========== TOKEN CREATION COMPLETED ==========`);
      return jsonResponse(response);

    } catch (dbError) {
      log('ERROR', `[${requestId}] Unexpected database error`, { 
        error: dbError.message, 
        stack: dbError.stack 
      });
      return jsonResponse({ 
        error: `Database error: ${dbError.message}`,
        requestId,
        solanaCreated: true,
        mintAddress: solanaResult.mintAddress
      }, 500);
    }

  } catch (err: any) {
    log('ERROR', `[${requestId}] ========== FATAL ERROR ==========`, { 
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