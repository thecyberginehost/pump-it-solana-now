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

    // For devnet testing, create a simple transaction that user can sign
    try {
      // Get platform private key for minting
      const platformPrivateKey = getEnv("PLATFORM_WALLET_PRIVATE_KEY");
      let platformKeypair: Keypair;
      
      try {
        // Try parsing as JSON array first
        const privateKeyArray = JSON.parse(platformPrivateKey);
        platformKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
      } catch (jsonError) {
        // If JSON parsing fails, try as base58 string
        console.log('Trying base58 format for private key...');
        try {
          // Assuming it might be a base58 encoded string, decode it
          const decoded = Uint8Array.from(Buffer.from(platformPrivateKey, 'base64'));
          platformKeypair = Keypair.fromSecretKey(decoded);
        } catch (base64Error) {
          console.error('Private key format error:', { jsonError, base64Error });
          throw new Error('Invalid private key format. Must be JSON array or base64 string.');
        }
      }

      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        mintAddress,
        userPublicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      console.log('User token account:', userTokenAccount.toBase58());

      // Check if user token account exists
      let needsTokenAccount = false;
      try {
        await getAccount(connection, userTokenAccount);
        console.log('Token account exists');
      } catch {
        needsTokenAccount = true;
        console.log('Need to create token account');
      }

      // Create user transaction (they pay for account creation)
      const userTransaction = new Transaction();
      
      // Add compute budget
      userTransaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
      );

      // Create associated token account if needed
      if (needsTokenAccount) {
        userTransaction.add(
          createAssociatedTokenAccountInstruction(
            userPublicKey, // payer
            userTokenAccount,
            userPublicKey, // owner
            mintAddress,
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      userTransaction.recentBlockhash = blockhash;
      userTransaction.feePayer = userPublicKey;

      // Serialize transaction for user to sign
      const serializedTransaction = userTransaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      // Simulate the mint operation (in production this would be bonding curve contract)
      // For devnet, we'll mint tokens directly to the user after they sign
      const mintTransaction = new Transaction();
      mintTransaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
        createMintToInstruction(
          mintAddress,
          userTokenAccount,
          platformKeypair.publicKey, // mint authority
          BigInt(Math.floor(trade.tokensOut * Math.pow(10, 6))) // 6 decimals
        )
      );

      mintTransaction.recentBlockhash = blockhash;
      mintTransaction.feePayer = platformKeypair.publicKey;

      // Execute the mint transaction with platform wallet
      console.log('Executing mint transaction...');
      const mintSignature = await sendAndConfirmTransaction(
        connection,
        mintTransaction,
        [platformKeypair]
      );
      console.log('✅ Tokens minted:', mintSignature);

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

      console.log('✅ Devnet buy completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          requiresSignature: needsTokenAccount,
          transaction: needsTokenAccount ? Array.from(serializedTransaction) : null,
          trade: {
            type: 'buy',
            solIn: solAmount,
            tokensOut: trade.tokensOut,
            priceAfter: trade.priceAfter,
            marketCapAfter: trade.marketCapAfter,
          },
          mintSignature,
          message: needsTokenAccount 
            ? 'Token account creation required - please sign transaction' 
            : 'Purchase completed - tokens minted to your wallet'
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