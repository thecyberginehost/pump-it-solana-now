import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
} from "https://esm.sh/@solana/spl-token@0.4.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calculate SOL for tokens using bonding curve formula
 */
function calculateSell(tokensIn: number, solRaised: number, tokensSold: number): {
  solOut: number;
  priceAfter: number;
  newSolRaised: number;
  newTokensSold: number;
  marketCapAfter: number;
} {
  const VIRTUAL_SOL_RESERVES = 30;
  const VIRTUAL_TOKEN_RESERVES = 1073000000;
  const TOTAL_SUPPLY = 1000000000;

  const currentVirtualSol = VIRTUAL_SOL_RESERVES + solRaised;
  const currentVirtualTokens = VIRTUAL_TOKEN_RESERVES - tokensSold;

  // Constant product: k = x * y
  const k = currentVirtualSol * currentVirtualTokens;
  const newVirtualTokens = currentVirtualTokens + tokensIn;
  const newVirtualSol = k / newVirtualTokens;
  const solOut = currentVirtualSol - newVirtualSol;

  const newSolRaised = solRaised - solOut;
  const newTokensSold = tokensSold - tokensIn;
  const priceAfter = newVirtualSol / newVirtualTokens;
  const marketCapAfter = priceAfter * TOTAL_SUPPLY;

  return {
    solOut,
    priceAfter,
    newSolRaised,
    newTokensSold,
    marketCapAfter,
  };
}

/**
 * Execute real bonding curve sell with actual SOL transfer
 */
serve(async (req) => {
  console.log('=== REAL BONDING CURVE SELL ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tokenId, walletAddress, tokenAmount, signedTransaction, platformSignature } = await req.json();

    console.log('Processing real sell:', { tokenId, walletAddress, tokenAmount });

    if (!signedTransaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction signature required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // CRITICAL: Verify platform signature for exclusive access
    if (!platformSignature || !platformSignature.signature) {
      return new Response(
        JSON.stringify({ 
          error: 'Platform signature required - trades must go through official platform',
          code: 'PLATFORM_SIGNATURE_REQUIRED'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Get token data
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (tokenError || !token) {
      return new Response(
        JSON.stringify({ error: 'Token not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Validate platform signature
    const { data: signatureValid, error: sigError } = await supabase.rpc('validate_platform_signature', {
      p_token_id: tokenId,
      p_signature: platformSignature.signature
    });

    if (sigError || !signatureValid) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired platform signature',
          code: 'INVALID_PLATFORM_SIGNATURE'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check graduation status
    if (token.is_graduated) {
      return new Response(
        JSON.stringify({ error: 'Token has graduated to Raydium' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Helius Solana connection with staked connections
    const heliusRpcApiKey = Deno.env.get('HELIUS_RPC_API_KEY');
    if (!heliusRpcApiKey) {
      throw new Error('Helius RPC API key not configured');
    }
    
    const heliusRpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusRpcApiKey}`;
    const connection = new Connection(heliusRpcUrl, 'confirmed');

    // Calculate trade
    const trade = calculateSell(
      tokenAmount,
      token.sol_raised || 0,
      token.tokens_sold || 0
    );

    console.log('Trade calculation:', trade);

    // Get platform keypair
    const platformPrivateKey = Deno.env.get('PLATFORM_WALLET_PRIVATE_KEY');
    if (!platformPrivateKey) {
      throw new Error('Platform wallet private key not configured');
    }

    const platformKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(platformPrivateKey))
    );

    const mintAddress = new PublicKey(token.mint_address);
    const userPublicKey = new PublicKey(walletAddress);
    const bondingCurveAddress = new PublicKey(token.bonding_curve_address);

    // Execute the user's transaction (contains token transfer to bonding curve)
    const userTransaction = Transaction.from(Uint8Array.from(signedTransaction));
    
    console.log('Submitting user transaction...');
    const userTxId = await connection.sendRawTransaction(userTransaction.serialize());
    await connection.confirmTransaction(userTxId);
    console.log('✅ User transaction confirmed:', userTxId);

    // Now send SOL from bonding curve to user
    const solTransferTx = new Transaction();

    const solAmount = Math.floor(trade.solOut * LAMPORTS_PER_SOL);
    solTransferTx.add(
      SystemProgram.transfer({
        fromPubkey: platformKeypair.publicKey, // Platform holds bonding curve SOL for now
        toPubkey: userPublicKey,
        lamports: solAmount,
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    solTransferTx.recentBlockhash = blockhash;
    solTransferTx.feePayer = platformKeypair.publicKey;

    console.log('Executing SOL transfer...');
    const transferTxId = await sendAndConfirmTransaction(
      connection,
      solTransferTx,
      [platformKeypair]
    );
    console.log('✅ SOL transfer confirmed:', transferTxId);

    // Update database with new state
    const { error: updateError } = await supabase
      .from('tokens')
      .update({
        sol_raised: trade.newSolRaised,
        tokens_sold: trade.newTokensSold,
        market_cap: trade.marketCapAfter,
        price: trade.priceAfter,
        is_graduated: trade.marketCapAfter >= 100000,
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
      activity_type: 'sell',
      amount_sol: trade.solOut,
      token_amount: tokenAmount,
      token_price: trade.priceAfter,
      market_cap_at_time: trade.marketCapAfter,
    });

    console.log('🎉 REAL SELL COMPLETED!');
    console.log('🪙 Tokens received by contract:', tokenAmount);
    console.log('💰 SOL sent to user:', trade.solOut);

    return new Response(
      JSON.stringify({
        success: true,
        userTxId,
        transferTxId,
        trade: {
          type: 'sell',
          tokensIn: tokenAmount,
          solOut: trade.solOut,
          priceAfter: trade.priceAfter,
          marketCapAfter: trade.marketCapAfter,
        },
        message: `✅ Successfully sold ${tokenAmount} ${token.symbol} for ${trade.solOut.toFixed(6)} SOL`,
        solRemaining: trade.newSolRaised,
        liquidityStatus: trade.marketCapAfter >= 100000 ? 'GRADUATED - Ready for Raydium!' : 'Accumulating for graduation',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== REAL SELL ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to execute real sell', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});