// Import Node.js Buffer for Deno 2 compatibility
import { Buffer } from "node:buffer";

// Make Buffer globally available for Solana libraries
globalThis.Buffer = Buffer;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  AccountMeta,
  TransactionInstruction,
} from "npm:@solana/web3.js@1.98.2";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
} from "npm:@solana/spl-token@0.4.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BONDING_CURVE_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

/**
 * Create buy instruction for bonding curve
 */
function createBuyInstruction(
  bondingCurve: PublicKey,
  mint: PublicKey,
  curveTokenAccount: PublicKey,
  userTokenAccount: PublicKey,
  user: PublicKey,
  solAmount: number
): TransactionInstruction {
  // Instruction data: [instruction_type (1 byte), sol_amount (8 bytes)]
  const instructionData = new Uint8Array(9);
  const dataView = new DataView(instructionData.buffer);
  dataView.setUint8(0, 1); // Buy instruction
  dataView.setBigUint64(1, BigInt(solAmount * LAMPORTS_PER_SOL), true); // little endian

  const accounts: AccountMeta[] = [
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: curveTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys: accounts,
    programId: BONDING_CURVE_PROGRAM_ID,
    data: instructionData,
  });
}

/**
 * Calculate tokens received for SOL input using bonding curve math
 */
function calculateBuy(solIn: number, solRaised: number, tokensSold: number): {
  tokensOut: number;
  priceAfter: number;
  newSolRaised: number;
  newTokensSold: number;
} {
  // Pump.fun constants
  const VIRTUAL_SOL_RESERVES = 30;
  const VIRTUAL_TOKEN_RESERVES = 1073000000; // 1.073B tokens
  const TOTAL_CURVE_TOKENS = 800000000; // 800M tokens for bonding curve

  // Current virtual reserves
  const currentVirtualSol = VIRTUAL_SOL_RESERVES + solRaised;
  const currentVirtualTokens = VIRTUAL_TOKEN_RESERVES - tokensSold;

  // Constant product: k = x * y
  const k = currentVirtualSol * currentVirtualTokens;

  // After buying: (virtualSol + solIn) * (virtualTokens - tokensOut) = k
  // Solve for tokensOut: tokensOut = virtualTokens - k / (virtualSol + solIn)
  const newVirtualSol = currentVirtualSol + solIn;
  const newVirtualTokens = k / newVirtualSol;
  const tokensOut = currentVirtualTokens - newVirtualTokens;

  const newSolRaised = solRaised + solIn;
  const newTokensSold = tokensSold + tokensOut;

  // Price after trade
  const priceAfter = newVirtualSol / newVirtualTokens;

  return {
    tokensOut,
    priceAfter,
    newSolRaised,
    newTokensSold,
  };
}

serve(async (req) => {
  console.log('=== BONDING CURVE BUY REQUEST ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tokenId, walletAddress, solAmount } = await req.json();

    console.log('Processing buy:', { tokenId, walletAddress, solAmount });

    if (!tokenId || !walletAddress || !solAmount || solAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid parameters' }),
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

    // Check if graduated
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
    
    const mintAddress = new PublicKey(token.mint_address);
    const bondingCurveAddress = new PublicKey(token.bonding_curve_address);
    const userPublicKey = new PublicKey(walletAddress);

    // Calculate trade
    const trade = calculateBuy(
      solAmount,
      token.sol_raised || 0,
      token.tokens_sold || 0
    );

    console.log('Calculated buy trade:', trade);

    // Build transaction
    const transaction = new Transaction();

    // Get user's associated token account
    const userTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      userPublicKey
    );

    // Check if user token account exists, create if not
    try {
      await getAccount(connection, userTokenAccount);
    } catch (error) {
      // Account doesn't exist, create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userPublicKey, // payer
          userTokenAccount, // account to create
          userPublicKey, // owner
          mintAddress // mint
        )
      );
    }

    // Get bonding curve token account
    const curveTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      bondingCurveAddress,
      true // allowOwnerOffCurve
    );

    // Add buy instruction
    transaction.add(
      createBuyInstruction(
        bondingCurveAddress,
        mintAddress,
        curveTokenAccount,
        userTokenAccount,
        userPublicKey,
        solAmount
      )
    );

    // Set transaction metadata
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    // Serialize transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    console.log('✅ Buy transaction prepared');
    console.log('💰 SOL in:', solAmount);
    console.log('🪙 Tokens out:', trade.tokensOut);

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
          newSolRaised: trade.newSolRaised,
          newTokensSold: trade.newTokensSold,
        },
        message: `Buy transaction prepared: ${solAmount} SOL → ${trade.tokensOut.toFixed(2)} ${token.symbol}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== BUY ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to prepare buy transaction', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});