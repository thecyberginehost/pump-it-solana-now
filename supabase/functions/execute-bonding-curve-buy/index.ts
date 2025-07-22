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
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
} from "https://esm.sh/@solana/spl-token@0.4.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calculate tokens for SOL using bonding curve formula
 */
function calculateBuy(solIn: number, solRaised: number, tokensSold: number): {
  tokensOut: number;
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
  const newVirtualSol = currentVirtualSol + solIn;
  const newVirtualTokens = k / newVirtualSol;
  const tokensOut = currentVirtualTokens - newVirtualTokens;

  const newSolRaised = solRaised + solIn;
  const newTokensSold = tokensSold + tokensOut;
  const priceAfter = newVirtualSol / newVirtualTokens;
  const marketCapAfter = priceAfter * TOTAL_SUPPLY;

  return {
    tokensOut,
    priceAfter,
    newSolRaised,
    newTokensSold,
    marketCapAfter,
  };
}

/**
 * Execute real bonding curve buy with actual token transfer
 */
serve(async (req) => {
  console.log('=== REAL BONDING CURVE BUY ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tokenId, walletAddress, solAmount, signedTransaction } = await req.json();

    console.log('Processing real buy:', { tokenId, walletAddress, solAmount });

    if (!signedTransaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction signature required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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

    // Check graduation status
    if (token.is_graduated) {
      return new Response(
        JSON.stringify({ error: 'Token has graduated to Raydium' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Calculate trade
    const trade = calculateBuy(
      solAmount,
      token.sol_raised || 0,
      token.tokens_sold || 0
    );

    console.log('Trade calculation:', trade);

    // Get platform keypair (for executing bonding curve operations)
    const platformPrivateKey = Deno.env.get('PLATFORM_WALLET_PRIVATE_KEY');
    if (!platformPrivateKey) {
      throw new Error('Platform wallet private key not configured');
    }

    // Decode platform private key
    const platformKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(platformPrivateKey))
    );

    const mintAddress = new PublicKey(token.mint_address);
    const userPublicKey = new PublicKey(walletAddress);
    const bondingCurveAddress = new PublicKey(token.bonding_curve_address);

    // Execute the user's transaction (contains SOL payment)
    const userTransaction = Transaction.from(Uint8Array.from(signedTransaction));
    
    console.log('Submitting user transaction...');
    const userTxId = await connection.sendRawTransaction(userTransaction.serialize());
    await connection.confirmTransaction(userTxId);
    console.log('✅ User transaction confirmed:', userTxId);

    // Now execute token transfer from bonding curve to user
    const tokenTransferTx = new Transaction();

    // Get token accounts
    const userTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      userPublicKey
    );

    const curveTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      bondingCurveAddress,
      true
    );

    // Check if user token account exists, create if not
    try {
      await getAccount(connection, userTokenAccount);
    } catch (error) {
      tokenTransferTx.add(
        createAssociatedTokenAccountInstruction(
          platformKeypair.publicKey, // payer (platform)
          userTokenAccount,
          userPublicKey, // owner
          mintAddress
        )
      );
    }

    // Transfer tokens from bonding curve to user
    const tokenAmount = Math.floor(trade.tokensOut * Math.pow(10, 9)); // Convert to smallest unit
    tokenTransferTx.add(
      createTransferInstruction(
        curveTokenAccount, // from
        userTokenAccount, // to
        bondingCurveAddress, // authority (would be smart contract in real implementation)
        tokenAmount
      )
    );

    // For now, platform signs as bonding curve (in real implementation, smart contract would do this)
    const { blockhash } = await connection.getLatestBlockhash();
    tokenTransferTx.recentBlockhash = blockhash;
    tokenTransferTx.feePayer = platformKeypair.publicKey;

    console.log('Executing token transfer...');
    const transferTxId = await sendAndConfirmTransaction(
      connection,
      tokenTransferTx,
      [platformKeypair]
    );
    console.log('✅ Token transfer confirmed:', transferTxId);

    // Update database with new state
    const { error: updateError } = await supabase
      .from('tokens')
      .update({
        sol_raised: trade.newSolRaised,
        tokens_sold: trade.newTokensSold,
        market_cap: trade.marketCapAfter,
        price: trade.priceAfter,
        is_graduated: trade.marketCapAfter >= 100000, // $100k graduation
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

    console.log('🎉 REAL BUY COMPLETED!');
    console.log('💰 SOL received by contract:', solAmount);
    console.log('🪙 Tokens sent to user:', trade.tokensOut);

    return new Response(
      JSON.stringify({
        success: true,
        userTxId,
        transferTxId,
        trade: {
          type: 'buy',
          solIn: solAmount,
          tokensOut: trade.tokensOut,
          priceAfter: trade.priceAfter,
          marketCapAfter: trade.marketCapAfter,
        },
        message: `✅ Successfully bought ${trade.tokensOut.toFixed(2)} ${token.symbol} for ${solAmount} SOL`,
        solAccumulated: trade.newSolRaised,
        liquidityStatus: trade.marketCapAfter >= 100000 ? 'GRADUATED - Ready for Raydium!' : 'Accumulating for graduation',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== REAL BUY ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to execute real buy', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});