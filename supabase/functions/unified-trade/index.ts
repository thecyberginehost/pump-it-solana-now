import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  createTransferCheckedInstruction,
} from "https://esm.sh/@solana/spl-token@0.4.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Bonding curve math
const VIRTUAL_SOL_RESERVES = 30;
const VIRTUAL_TOKEN_RESERVES = 1073000000;

function calculateBuy(solIn: number, solRaised: number, tokensSold: number) {
  const currentVirtualSol = VIRTUAL_SOL_RESERVES + solRaised;
  const currentVirtualTokens = VIRTUAL_TOKEN_RESERVES - tokensSold;
  
  const k = currentVirtualSol * currentVirtualTokens;
  const newVirtualSol = currentVirtualSol + solIn;
  const newVirtualTokens = k / newVirtualSol;
  const tokensOut = currentVirtualTokens - newVirtualTokens;
  
  return {
    tokensOut,
    newSolRaised: solRaised + solIn,
    newTokensSold: tokensSold + tokensOut,
    priceAfter: newVirtualSol / newVirtualTokens,
    marketCapAfter: (newVirtualSol / newVirtualTokens) * 1000000000
  };
}

function calculateSell(tokensIn: number, solRaised: number, tokensSold: number) {
  const currentVirtualSol = VIRTUAL_SOL_RESERVES + solRaised;
  const currentVirtualTokens = VIRTUAL_TOKEN_RESERVES - tokensSold;
  
  const k = currentVirtualSol * currentVirtualTokens;
  const newVirtualTokens = currentVirtualTokens + tokensIn;
  const newVirtualSol = k / newVirtualTokens;
  const solOut = currentVirtualSol - newVirtualSol;
  
  return {
    solOut,
    newSolRaised: solRaised - solOut,
    newTokensSold: tokensSold - tokensIn,
    priceAfter: newVirtualSol / newVirtualTokens,
    marketCapAfter: (newVirtualSol / newVirtualTokens) * 1000000000
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);

    const body = await req.json().catch(() => null);
    if (!body) return jsonResponse({ error: "Invalid JSON body" }, 400);

    const { tokenId, tradeType, amount, walletAddress, signedTransaction } = body;
    
    if (!tokenId || !tradeType || !amount || !walletAddress) {
      return jsonResponse({ error: "Missing required parameters" }, 400);
    }

    if (!["buy", "sell"].includes(tradeType)) {
      return jsonResponse({ error: 'Trade type must be "buy" or "sell"' }, 400);
    }

    console.log(`Processing ${tradeType} trade:`, { tokenId, amount, walletAddress });

    // Initialize Supabase
    const supabase = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Get token data
    const { data: token, error: tokenError } = await supabase
      .from("tokens")
      .select("*")
      .eq("id", tokenId)
      .single();

    if (tokenError || !token) {
      return jsonResponse({ error: "Token not found" }, 404);
    }

    if (token.is_graduated) {
      return jsonResponse({ error: "Token has graduated to Raydium" }, 400);
    }

    // Calculate trade
    let trade;
    if (tradeType === "buy") {
      trade = calculateBuy(amount, token.sol_raised || 0, token.tokens_sold || 0);
    } else {
      trade = calculateSell(amount, token.sol_raised || 0, token.tokens_sold || 0);
    }

    console.log("Trade calculation:", trade);

    // Initialize Solana connection
    const heliusKey = getEnv("HELIUS_RPC_API_KEY");
    const connection = new Connection(`https://devnet.helius-rpc.com/?api-key=${heliusKey}`, "confirmed");

    // Get platform keypair
    const platformPrivateKey = getEnv("PLATFORM_WALLET_PRIVATE_KEY");
    let platformKeypair: Keypair;
    
    try {
      const privateKeyArray = JSON.parse(platformPrivateKey);
      platformKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
    } catch (jsonError) {
      try {
        const bs58 = await import('https://esm.sh/bs58@5.0.0');
        const decoded = bs58.default.decode(platformPrivateKey);
        platformKeypair = Keypair.fromSecretKey(decoded);
      } catch (base64Error) {
        throw new Error('Invalid private key format');
      }
    }

    const mintAddress = new PublicKey(token.mint_address);
    const userPublicKey = new PublicKey(walletAddress);

    // Get token accounts
    const platformTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      platformKeypair.publicKey
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      userPublicKey
    );

    const transaction = new Transaction();

    // Ensure user has token account
    try {
      await getAccount(connection, userTokenAccount);
    } catch (error) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          platformKeypair.publicKey, // payer
          userTokenAccount,
          userPublicKey,
          mintAddress
        )
      );
    }

    if (tradeType === "buy") {
      // SOL -> Tokens
      // User sends SOL to platform, platform sends tokens to user
      
      // Platform sends tokens to user
      transaction.add(
        createTransferCheckedInstruction(
          platformTokenAccount,
          mintAddress,
          userTokenAccount,
          platformKeypair.publicKey,
          BigInt(Math.floor(trade.tokensOut * 1e6)), // Convert to token decimals
          6 // decimals
        )
      );

      // User SOL payment will be handled by frontend via separate transaction
      
    } else {
      // Tokens -> SOL  
      // User sends tokens to platform, platform sends SOL to user
      
      // Send SOL to user
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: platformKeypair.publicKey,
          toPubkey: userPublicKey,
          lamports: Math.floor(trade.solOut * LAMPORTS_PER_SOL),
        })
      );
      
      // User token transfer will be handled by frontend via separate transaction
    }

    // Execute transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = platformKeypair.publicKey;

    console.log("Executing trade transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [platformKeypair]
    );

    console.log("✅ Trade executed:", signature);

    // Update token state in database
    const { error: updateError } = await supabase
      .from("tokens")
      .update({
        sol_raised: trade.newSolRaised,
        tokens_sold: trade.newTokensSold,
        market_cap: trade.marketCapAfter,
        price: trade.priceAfter,
        is_graduated: trade.marketCapAfter >= 100000, // $100k graduation
        volume_24h: (token.volume_24h || 0) + (tradeType === "buy" ? amount : trade.solOut),
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokenId);

    if (updateError) {
      console.error("Database update error:", updateError);
    }

    // Record trading activity
    await supabase.from("trading_activities").insert({
      token_id: tokenId,
      user_wallet: walletAddress,
      activity_type: tradeType,
      amount_sol: tradeType === "buy" ? amount : trade.solOut,
      token_amount: tradeType === "buy" ? trade.tokensOut : amount,
      token_price: trade.priceAfter,
      market_cap_at_time: trade.marketCapAfter,
    });

    // Update user portfolio
    try {
      if (tradeType === "buy") {
        // Upsert user portfolio
        await supabase.from("user_portfolios").upsert({
          user_wallet: walletAddress,
          token_id: tokenId,
          token_amount: trade.tokensOut,
          average_buy_price: trade.priceAfter,
          total_invested: amount,
          last_activity_at: new Date().toISOString(),
        }, {
          onConflict: "user_wallet,token_id"
        });
      }
    } catch (portfolioError) {
      console.error("Portfolio update error:", portfolioError);
    }

    // Check achievements
    try {
      await supabase.rpc("check_and_award_achievements", {
        p_user_wallet: walletAddress,
        p_token_id: tokenId,
        p_check_type: "trading"
      });
    } catch (error) {
      console.error("Achievement check failed:", error);
    }

    return jsonResponse({
      success: true,
      signature,
      trade: {
        type: tradeType,
        solAmount: tradeType === "buy" ? amount : trade.solOut,
        tokenAmount: tradeType === "buy" ? trade.tokensOut : amount,
        priceAfter: trade.priceAfter,
        marketCapAfter: trade.marketCapAfter,
      },
      token: {
        ...token,
        sol_raised: trade.newSolRaised,
        tokens_sold: trade.newTokensSold,
        market_cap: trade.marketCapAfter,
        price: trade.priceAfter,
      },
      message: `${tradeType.toUpperCase()} completed successfully!`
    });

  } catch (err: any) {
    console.error("Trade execution error:", err?.message, err?.stack);
    return jsonResponse({ error: err?.message ?? "Unknown error" }, 500);
  }
});