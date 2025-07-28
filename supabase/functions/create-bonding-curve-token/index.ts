// supabase/functions/create-bonding-curve-token/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  setAuthority,
  AuthorityType,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "https://esm.sh/@solana/spl-token@0.4.6";
import bs58 from "https://esm.sh/bs58@5.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

function getSupa() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// ---------- Helpers ----------
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getConnection(): Connection {
  const heliusKey = getEnv("HELIUS_RPC_API_KEY");
  // Use devnet for testing to avoid mainnet SOL costs
  return new Connection(`https://devnet.helius-rpc.com/?api-key=${heliusKey}`, { commitment: "confirmed" });
}

async function getPlatformKeypair(): Promise<Keypair> {
  const raw = getEnv("PLATFORM_WALLET_PRIVATE_KEY").trim();
  const secret = bs58.decode(raw);
  if (secret.length !== 64) throw new Error("PLATFORM_WALLET_PRIVATE_KEY length invalid");
  const keypair = Keypair.fromSecretKey(secret);
  
  // Log the public key for debugging
  console.log(`Platform wallet public key: ${keypair.publicKey.toBase58()}`);
  
  return keypair;
}

// Generate vanity address with "moon" suffix - optimized for edge function limits
function generateVanityKeypair(suffix: string, maxAttempts: number = 5000): { keypair: Keypair; attempts: number } | null {
  const targetSuffix = suffix.toLowerCase();
  const startTime = Date.now();
  const maxTime = 8000; // 8 seconds max to avoid timeout
  
  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58().toLowerCase();
    
    if (address.endsWith(targetSuffix)) {
      console.log(`✨ Generated vanity address ending in "${suffix}" after ${attempts} attempts: ${keypair.publicKey.toBase58()}`);
      return { keypair, attempts };
    }
    
    // Check if we're approaching time limit
    if (Date.now() - startTime > maxTime) {
      console.warn(`⏰ Vanity generation timeout after ${attempts} attempts (${maxTime}ms)`);
      break;
    }
    
    // Log progress every 1k attempts
    if (attempts % 1000 === 0) {
      console.log(`🔄 Vanity generation progress: ${attempts}/${maxAttempts} attempts for suffix "${suffix}"`);
    }
  }
  
  console.warn(`⚠️ Could not generate vanity address with suffix "${suffix}" after ${maxAttempts} attempts or timeout`);
  return null;
}

// ---------- Request Types ----------
interface CreateCurveTokenRequest {
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  telegram?: string;
  twitter?: string;
  creatorWallet: string;
  signedTransaction?: any;
  initialBuyIn?: number;
  decimals?: number;
  totalSupply?: number;
  curveConfig?: {
    startingPriceLamports?: number;
    slopeBps?: number;
    feeBps?: number;
  };
}

// ---------- Main ----------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.log("=== TOKEN CREATION START ===");
    console.log("Request method:", req.method);
    
    if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);

    // Simple test - just return success with environment check
    console.log("Testing environment variables...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");  
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    const platformKey = Deno.env.get("PLATFORM_WALLET_PRIVATE_KEY");
    
    console.log("Environment variables:");
    console.log("- SUPABASE_URL:", supabaseUrl ? "✅ Present" : "❌ Missing");
    console.log("- SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "✅ Present" : "❌ Missing");
    console.log("- HELIUS_RPC_API_KEY:", heliusKey ? "✅ Present" : "❌ Missing");
    console.log("- PLATFORM_WALLET_PRIVATE_KEY:", platformKey ? "✅ Present" : "❌ Missing");

    const body = (await req.json().catch(() => null)) as CreateCurveTokenRequest | null;
    if (!body) return jsonResponse({ error: "Invalid JSON body" }, 400);

    console.log("Request body received:", { 
      name: body.name, 
      symbol: body.symbol, 
      creatorWallet: body.creatorWallet 
    });

    const { name, symbol, creatorWallet } = body;
    
    if (!name || !symbol || !creatorWallet) {
      return jsonResponse({ error: "name, symbol, and creatorWallet required" }, 400);
    }

    // Return a test response that matches frontend expectations
    return jsonResponse({
      success: true,
      message: "Test mode - environment variables checked successfully",
      token: {
        id: "test-token-id-" + Date.now(),
        name,
        symbol,
        creator_wallet: creatorWallet,
        mint_address: "test-mint-address",
        created_at: new Date().toISOString()
      },
      environmentStatus: {
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey,
        heliusKey: !!heliusKey,
        platformKey: !!platformKey
      },
      testMode: true,
      requiresSignature: false
    });
  } catch (err: any) {
    console.error("=== FULL ERROR DETAILS ===");
    console.error("Error message:", err?.message);
    console.error("Error stack:", err?.stack);
    console.error("Error name:", err?.name);
    console.error("Full error object:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error("==========================");
    
    return new Response(JSON.stringify({ 
      error: err?.message ?? "Unknown error",
      errorName: err?.name,
      errorStack: err?.stack
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
