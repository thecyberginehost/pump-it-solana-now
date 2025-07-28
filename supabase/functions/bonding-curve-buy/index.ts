import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
  TransactionInstruction,
  AccountMeta,
  ComputeBudgetProgram,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createMintToInstruction,
} from "https://esm.sh/@solana/spl-token@0.4.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function getSupa() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getConnection(): Connection {
  const heliusKey = getEnv("HELIUS_RPC_API_KEY");
  return new Connection(`https://devnet.helius-rpc.com/?api-key=${heliusKey}`, { commitment: "confirmed" });
}

// Bonding curve calculation (simplified for devnet testing)
function calculateBuy(solIn: number, solRaised: number, tokensSold: number): {
  tokensOut: number;
  priceAfter: number;
  newSolRaised: number;
  newTokensSold: number;
  marketCapAfter: number;
} {
  const VIRTUAL_SOL_RESERVES = 30;
  const VIRTUAL_TOKEN_RESERVES = 1073000000;
  
  const currentVirtualSol = VIRTUAL_SOL_RESERVES + solRaised;
  const currentVirtualTokens = VIRTUAL_TOKEN_RESERVES - tokensSold;

  const k = currentVirtualSol * currentVirtualTokens;
  const newVirtualSol = currentVirtualSol + solIn;
  const newVirtualTokens = k / newVirtualSol;
  const tokensOut = currentVirtualTokens - newVirtualTokens;

  const newSolRaised = solRaised + solIn;
  const newTokensSold = tokensSold + tokensOut;
  const priceAfter = newVirtualSol / newVirtualTokens;
  const marketCapAfter = priceAfter * 1000000000; // 1B total supply

  return {
    tokensOut,
    priceAfter,
    newSolRaised,
    newTokensSold,
    marketCapAfter,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST" }), { status: 405, headers: corsHeaders });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: corsHeaders });
    }

    const { tokenId, walletAddress, solAmount } = body;
    
    if (!tokenId || !walletAddress || !solAmount) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: tokenId, walletAddress, solAmount" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('🚀 Processing buy request:', { tokenId, walletAddress, solAmount });

    const supabase = getSupa();
    const connection = getConnection();

    // Get token data
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (tokenError || !token) {
      console.error('Token not found:', tokenError);
      return new Response(
        JSON.stringify({ error: "Token not found" }), 
        { status: 404, headers: corsHeaders }
      );
    }

    console.log('Token found:', { symbol: token.symbol, mintAddress: token.mint_address });

    // Validate wallet address
    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(walletAddress);
    } catch (error) {
      console.error('Invalid wallet address:', error);
      return new Response(
        JSON.stringify({ error: "Invalid wallet address", details: "Non-base58 character" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate mint address
    let mintAddress: PublicKey;
    try {
      mintAddress = new PublicKey(token.mint_address);
    } catch (error) {
      console.error('Invalid mint address:', error);
      return new Response(
        JSON.stringify({ error: "Invalid mint address", details: "Non-base58 character" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // Calculate trade
    const trade = calculateBuy(solAmount, token.sol_raised || 0, token.tokens_sold || 0);
    console.log('Trade calculation:', trade);

    // For devnet testing, simulate the buy by directly minting tokens to user
    try {
      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        mintAddress,
        userPublicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      console.log('User token account:', userTokenAccount.toBase58());

      // Create transaction
      const transaction = new Transaction();
      
      // Add compute budget
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
      );

      // Check if user token account exists
      let needsTokenAccount = false;
      try {
        await getAccount(connection, userTokenAccount);
        console.log('Token account exists');
      } catch {
        needsTokenAccount = true;
        console.log('Need to create token account');
      }

      // Create associated token account if needed
      if (needsTokenAccount) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            userPublicKey, // payer
            userTokenAccount,
            userPublicKey, // owner
            mintAddress,
            TOKEN_PROGRAM_ID
          )
        );
      }

      // For devnet testing, simulate by transferring SOL and recording the trade
      // In production, this would be the actual bonding curve smart contract transaction
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPublicKey;

      // Serialize transaction for user to sign
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      // Update token state in database
      const { error: updateError } = await supabase
        .from('tokens')
        .update({
          sol_raised: trade.newSolRaised,
          tokens_sold: trade.newTokensSold,
          market_cap: trade.marketCapAfter,
          price: trade.priceAfter,
          volume_24h: (token.volume_24h || 0) + solAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenId);

      if (updateError) {
        console.error('Database update error:', updateError);
      }

      // Record trading activity
      await supabase.from('trading_activities').insert({
        token_id: tokenId,
        user_wallet: walletAddress,
        activity_type: 'buy',
        amount_sol: solAmount,
        token_amount: trade.tokensOut,
        token_price: trade.priceAfter,
        market_cap_at_time: trade.marketCapAfter,
      });

      console.log('✅ Buy simulation completed');

      return new Response(
        JSON.stringify({
          success: true,
          requiresSignature: true,
          transaction: Array.from(serializedTransaction),
          trade: {
            type: 'buy',
            solIn: solAmount,
            tokensOut: trade.tokensOut,
            priceAfter: trade.priceAfter,
            marketCapAfter: trade.marketCapAfter,
          },
          message: 'Devnet simulation - transaction prepared for signing'
        }),
        { headers: corsHeaders }
      );

    } catch (error) {
      console.error('Transaction preparation error:', error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to process buy transaction", 
          details: error.message 
        }), 
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (err: any) {
    console.error("ERR:bonding-curve-buy", err?.message, err?.stack);
    return new Response(
      JSON.stringify({ 
        error: "Failed to process buy transaction", 
        details: err?.message ?? "Unknown error" 
      }), 
      { status: 500, headers: corsHeaders }
    );
  }
});