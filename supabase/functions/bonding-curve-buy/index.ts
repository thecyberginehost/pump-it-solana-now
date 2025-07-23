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
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
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

// Helius Sender designated tip accounts (mainnet-beta)
const TIP_ACCOUNTS = [
  "4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE",
  "D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ", 
  "9bnz4RShgq1hAnLnZbP8kbgBg1kEmcJBYQq3gQbmnSta",
  "5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn",
  "2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD",
  "2q5pghRs6arqVjRvT5gfgWfWcHWmw1ZuCzphgd5KfWGJ",
  "wyvPkWjVZz1M8fHQnMMCDTQDbkManefNNhweYk5WkcF",
  "3KCKozbAaF75qEU33jtzozcJ29yJuaLJTy2jFdzUY8bT",
  "4vieeGHPYPG2MmyPRcYjdiDmmhN3ww7hsFNap8pVN3Ey",
  "4TQLFNWK8AovT1gFvda5jfw2oJeRMKEmw7aH6MGBJ3or"
];

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

/**
 * Get dynamic priority fee from Helius Priority Fee API
 */
async function getPriorityFee(
  connection: Connection, 
  instructions: TransactionInstruction[], 
  payerKey: PublicKey, 
  blockhash: string
): Promise<number> {
  try {
    const tempTx = new VersionedTransaction(
      new TransactionMessage({
        instructions,
        payerKey,
        recentBlockhash: blockhash,
      }).compileToV0Message()
    );
    
    const response = await fetch(connection.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getPriorityFeeEstimate",
        params: [{
          transaction: Buffer.from(tempTx.serialize()).toString('base64'),
          options: { recommended: true },
        }],   
      }),
    });
    
    const data = await response.json();
    return data.result?.priorityFeeEstimate ? 
      Math.ceil(data.result.priorityFeeEstimate * 1.2) : 50_000;
  } catch {
    return 50_000; // Fallback fee
  }
}

/**
 * Send transaction via Helius Sender with retry logic
 */
async function sendViaSender(
  transaction: VersionedTransaction,
  connection: Connection,
  lastValidBlockHeight: number
): Promise<string> {
  const maxRetries = 3;
  // Use Salt Lake City endpoint for best performance
  const endpoint = 'http://slc-sender.helius-rpc.com/fast';
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check blockhash validity
      const currentHeight = await connection.getBlockHeight('confirmed');
      if (currentHeight > lastValidBlockHeight) {
        throw new Error('Blockhash expired');
      }
      
      console.log(`🚀 Sending via Helius Sender (attempt ${attempt + 1})`);
      
      // Send transaction via Sender endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now().toString(),
          method: "sendTransaction",
          params: [
            Buffer.from(transaction.serialize()).toString('base64'),
            {
              encoding: "base64",
              skipPreflight: true,    // Required for Sender
              maxRetries: 0           // Implement own retry logic
            }
          ]
        })
      });
      
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      console.log(`✅ Transaction sent via Sender: ${result.result}`);
      return result.result;
      
    } catch (error) {
      console.warn(`Sender attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('All Sender retry attempts failed');
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
    
    console.log('📝 Request details:', {
      tokenId,
      walletAddress,
      solAmount,
      timestamp: new Date().toISOString()
    });

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

    // Initialize Helius Solana connection
    const heliusRpcApiKey = Deno.env.get('HELIUS_RPC_API_KEY');
    if (!heliusRpcApiKey) {
      throw new Error('Helius RPC API key not configured');
    }
    
    const heliusRpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusRpcApiKey}`;
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

    // Get latest blockhash with context
    const { value: blockhashInfo } = await connection.getLatestBlockhashAndContext('confirmed');
    const { blockhash, lastValidBlockHeight } = blockhashInfo;

    // Build instructions array
    const instructions: TransactionInstruction[] = [];

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
      instructions.push(
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

    // Send SOL to the bonding curve contract (proper bonding curve mechanism)
    // The bonding curve contract will hold the SOL as liquidity reserves
    const platformWallet = bondingCurveAddress; // SOL goes to the bonding curve contract
    
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: platformWallet,
        lamports: solAmount * LAMPORTS_PER_SOL,
      })
    );

    // TODO: Add token transfer from bonding curve contract to user
    // In a real implementation, the bonding curve contract would automatically
    // transfer tokens back to the user. For devnet simulation, we would need
    // either a real contract or a platform-controlled token account to transfer from.

    // Get dynamic priority fee
    const priorityFee = await getPriorityFee(connection, instructions, userPublicKey, blockhash);
    
    // Add compute budget instructions at the beginning (required for Sender)
    instructions.unshift(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee })
    );
    instructions.unshift(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 })
    );

    // Add required tip transfer to random tip account (required for Sender)
    const tipAccount = new PublicKey(TIP_ACCOUNTS[Math.floor(Math.random() * TIP_ACCOUNTS.length)]);
    const tipAmountSOL = 0.001; // Minimum required tip
    
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: tipAccount,
        lamports: tipAmountSOL * LAMPORTS_PER_SOL,
      })
    );

    // Build versioned transaction for Sender
    const versionedTransaction = new VersionedTransaction(
      new TransactionMessage({
        instructions,
        payerKey: userPublicKey,
        recentBlockhash: blockhash,
      }).compileToV0Message()
    );

    // For devnet, skip Helius Sender and go directly to user signing
    console.log('📍 Running on devnet - using standard transaction flow (no Sender)');
    
    // Remove tip transfer for devnet (not needed without Sender)
    const devnetInstructions = instructions.slice(0, -1); // Remove last instruction (tip)
    
    // Build standard transaction for user to sign
    const legacyTransaction = new Transaction();
    legacyTransaction.add(...devnetInstructions);
    legacyTransaction.recentBlockhash = blockhash;
    legacyTransaction.feePayer = userPublicKey;

    const serializedTransaction = legacyTransaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    console.log('🔄 Transaction prepared for user signing');
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
        message: `Buy transaction prepared: ${solAmount} SOL → ${trade.tokensOut.toFixed(2)} ${token.symbol}`,
        platformSignature: {
          signature: `platform_sig_${Date.now()}`,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== BUY ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process buy transaction', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});