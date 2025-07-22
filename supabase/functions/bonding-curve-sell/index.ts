import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  AccountMeta,
  TransactionInstruction,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "https://esm.sh/@solana/spl-token@0.4.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BONDING_CURVE_PROGRAM_ID = new PublicKey('BondcurveMockProgramId11111111111111111111111');

/**
 * Create sell instruction for bonding curve
 */
function createSellInstruction(
  bondingCurve: PublicKey,
  mint: PublicKey,
  curveTokenAccount: PublicKey,
  userTokenAccount: PublicKey,
  user: PublicKey,
  tokenAmount: number
): TransactionInstruction {
  // Instruction data: [instruction_type (1 byte), token_amount (8 bytes)]
  const instructionData = Buffer.alloc(9);
  instructionData.writeUInt8(2, 0); // Sell instruction
  instructionData.writeBigUInt64LE(BigInt(tokenAmount * Math.pow(10, 9)), 1); // Convert to smallest unit

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
 * Calculate SOL received for token input using bonding curve math
 */
function calculateSell(tokensIn: number, solRaised: number, tokensSold: number): {
  solOut: number;
  priceAfter: number;
  newSolRaised: number;
  newTokensSold: number;
} {
  // Pump.fun constants
  const VIRTUAL_SOL_RESERVES = 30;
  const VIRTUAL_TOKEN_RESERVES = 1073000000; // 1.073B tokens

  // Current virtual reserves
  const currentVirtualSol = VIRTUAL_SOL_RESERVES + solRaised;
  const currentVirtualTokens = VIRTUAL_TOKEN_RESERVES - tokensSold;

  // Constant product: k = x * y
  const k = currentVirtualSol * currentVirtualTokens;

  // After selling: (virtualSol - solOut) * (virtualTokens + tokensIn) = k
  // Solve for solOut: solOut = virtualSol - k / (virtualTokens + tokensIn)
  const newVirtualTokens = currentVirtualTokens + tokensIn;
  const newVirtualSol = k / newVirtualTokens;
  const solOut = currentVirtualSol - newVirtualSol;

  const newSolRaised = solRaised - solOut;
  const newTokensSold = tokensSold - tokensIn;

  // Price after trade
  const priceAfter = newVirtualSol / newVirtualTokens;

  return {
    solOut,
    priceAfter,
    newSolRaised,
    newTokensSold,
  };
}

serve(async (req) => {
  console.log('=== BONDING CURVE SELL REQUEST ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tokenId, walletAddress, tokenAmount } = await req.json();

    console.log('Processing sell:', { tokenId, walletAddress, tokenAmount });

    if (!tokenId || !walletAddress || !tokenAmount || tokenAmount <= 0) {
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

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    const mintAddress = new PublicKey(token.mint_address);
    const bondingCurveAddress = new PublicKey(token.bonding_curve_address);
    const userPublicKey = new PublicKey(walletAddress);

    // Calculate trade
    const trade = calculateSell(
      tokenAmount,
      token.sol_raised || 0,
      token.tokens_sold || 0
    );

    console.log('Calculated sell trade:', trade);

    // Build transaction
    const transaction = new Transaction();

    // Get accounts
    const userTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      userPublicKey
    );

    const curveTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      bondingCurveAddress,
      true // allowOwnerOffCurve
    );

    // Add sell instruction
    transaction.add(
      createSellInstruction(
        bondingCurveAddress,
        mintAddress,
        curveTokenAccount,
        userTokenAccount,
        userPublicKey,
        tokenAmount
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

    console.log('✅ Sell transaction prepared');
    console.log('🪙 Tokens in:', tokenAmount);
    console.log('💰 SOL out:', trade.solOut);

    return new Response(
      JSON.stringify({
        success: true,
        requiresSignature: true,
        transaction: Array.from(serializedTransaction),
        trade: {
          type: 'sell',
          tokensIn: tokenAmount,
          solOut: trade.solOut,
          priceAfter: trade.priceAfter,
          newSolRaised: trade.newSolRaised,
          newTokensSold: trade.newTokensSold,
        },
        message: `Sell transaction prepared: ${tokenAmount} ${token.symbol} → ${trade.solOut.toFixed(6)} SOL`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== SELL ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to prepare sell transaction', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});