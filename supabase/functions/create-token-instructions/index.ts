/// <reference types="https://deno.land/x/xhr@0.3.0/mod.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Add Buffer polyfill for Deno
const { Buffer } = globalThis as any;
if (!Buffer) {
  const { Buffer: BufferPolyfill } = await import('https://deno.land/std@0.200.0/node/buffer.ts');
  (globalThis as any).Buffer = BufferPolyfill;
}

import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
} from 'https://esm.sh/@solana/web3.js@1.87.6';
import {
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint,
} from 'https://esm.sh/@solana/spl-token@0.3.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTokenRequest {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  telegram_url?: string;
  x_url?: string;
  creatorWallet: string;
}

interface TokenCreationInstructions {
  mintAddress: string;
  mintKeypair: number[];
  userTokenAccount: string;
  transactions: string[];
  estimatedCost: number;
  steps: string[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getConnection(): Connection {
  const heliusRpcKey = getEnv('HELIUS_RPC_API_KEY');
  const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusRpcKey}`;
  return new Connection(rpcUrl, 'confirmed');
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: CreateTokenRequest = await req.json();
    const { name, symbol, description, image, telegram_url, x_url, creatorWallet } = body;

    if (!name || !symbol || !creatorWallet) {
      return jsonResponse(
        { error: 'Missing required fields: name, symbol, creatorWallet' },
        400
      );
    }

    // Create connection and generate mint keypair
    const connection = getConnection();
    const mintKeypair = Keypair.generate();
    const creatorPublicKey = new PublicKey(creatorWallet);

    // Calculate rent-exempt balance for mint account
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);
    
    // Get associated token account address
    const userTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      creatorPublicKey
    );

    // Create transaction 1: Create and initialize mint
    const transaction1 = new Transaction();
    
    // Add compute budget instruction
    transaction1.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 })
    );

    // Create mint account
    transaction1.add(
      SystemProgram.createAccount({
        fromPubkey: creatorPublicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: 82, // Size of mint account
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // Initialize mint
    transaction1.add(
      createInitializeMint2Instruction(
        mintKeypair.publicKey,
        6, // decimals
        creatorPublicKey, // mint authority
        null // freeze authority
      )
    );

    // No second transaction needed - creator gets 0 tokens initially
    // This follows the pump.fun model where creators get 0 tokens and must purchase them

    // Set recent blockhash for transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction1.recentBlockhash = blockhash;
    transaction1.feePayer = creatorPublicKey;

    // Partially sign transaction with mint keypair
    transaction1.partialSign(mintKeypair);

    // Serialize transaction
    const serializedTx1 = transaction1.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Calculate estimated cost
    const tx1Fee = await connection.getFeeForMessage(transaction1.compileMessage());
    const totalFees = tx1Fee.value || 5000;
    const estimatedCost = (mintRent + totalFees) / LAMPORTS_PER_SOL;

    const response: TokenCreationInstructions = {
      mintAddress: mintKeypair.publicKey.toBase58(),
      mintKeypair: Array.from(mintKeypair.secretKey),
      userTokenAccount: userTokenAccount.toBase58(),
      transactions: [
        btoa(String.fromCharCode(...serializedTx1)),
      ],
      estimatedCost,
      steps: [
        'Create mint account and initialize token mint',
        'Upload metadata to Solana (handled separately)',
        'Store token data in database (handled after transactions)',
      ],
    };

    return jsonResponse({
      success: true,
      data: response,
      message: 'Token creation instructions generated. User must sign and submit transactions.',
    });

  } catch (error) {
    console.error('Error creating token instructions:', error);
    return jsonResponse(
      { 
        error: 'Failed to create token instructions', 
        details: error.message 
      },
      500
    );
  }
});