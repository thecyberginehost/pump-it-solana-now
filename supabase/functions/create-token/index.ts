// supabase/functions/create-token/index.ts

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
  createSetAuthorityInstruction,
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
  return new Connection(`https://devnet.helius-rpc.com/?api-key=${heliusKey}`, { commitment: "confirmed" });
}

interface CreateTokenRequest {
  name: string;
  symbol: string;
  decimals?: number;
  initialSupply?: number;
  userWallet: string;
}

interface TokenCreationInstructions {
  mintKeypair: number[];
  instructions: Array<{
    type: string;
    data: any;
  }>;
  totalEstimatedCost: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);

    const body = (await req.json().catch(() => null)) as CreateTokenRequest | null;
    if (!body) return jsonResponse({ error: "Invalid JSON body" }, 400);

    const { name, symbol, decimals = 9, initialSupply = 1000000000, userWallet } = body;
    if (!name || !symbol || !userWallet) return jsonResponse({ error: "name, symbol, and userWallet required" }, 400);

    const connection = getConnection();
    const userPublicKey = new PublicKey(userWallet);

    // Generate mint keypair
    const mintKeypair = Keypair.generate();
    const mintAddress = mintKeypair.publicKey;

    // Calculate costs
    const rentLamports = await getMinimumBalanceForRentExemptMint(connection);
    const estimatedGas = 15000; // Estimated lamports for transaction fees
    const totalCost = rentLamports + estimatedGas;

    // Get user's token account address
    const userTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      userPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Prepare transaction instructions
    const instructions = [
      // 1. Set compute budget
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
      
      // 2. Create mint account
      SystemProgram.createAccount({
        fromPubkey: userPublicKey,
        newAccountPubkey: mintAddress,
        space: MINT_SIZE,
        lamports: rentLamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      
      // 3. Initialize mint
      createInitializeMintInstruction(
        mintAddress,
        decimals,
        userPublicKey, // mint authority
        null, // no freeze authority
        TOKEN_PROGRAM_ID
      ),
      
      // 4. Create associated token account
      createAssociatedTokenAccountInstruction(
        userPublicKey, // payer
        userTokenAccount,
        userPublicKey, // owner
        mintAddress,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
      
      // 5. Mint tokens
      createMintToInstruction(
        mintAddress,
        userTokenAccount,
        userPublicKey, // mint authority
        BigInt(initialSupply) * (BigInt(10) ** BigInt(decimals))
      ),
      
      // 6. Revoke mint authority
      createSetAuthorityInstruction(
        mintAddress,
        userPublicKey, // current authority
        AuthorityType.MintTokens,
        null // new authority (null = revoke)
      )
    ];

    // Create multiple smaller transactions to avoid size limits
    const transaction1 = new Transaction();
    const transaction2 = new Transaction();
    
    // Transaction 1: Create mint account and initialize
    transaction1.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
      SystemProgram.createAccount({
        fromPubkey: userPublicKey,
        newAccountPubkey: mintAddress,
        space: MINT_SIZE,
        lamports: rentLamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintAddress,
        decimals,
        userPublicKey,
        null,
        TOKEN_PROGRAM_ID
      )
    );

    // Transaction 2: Create token account, mint tokens, and revoke authority
    transaction2.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
      createAssociatedTokenAccountInstruction(
        userPublicKey,
        userTokenAccount,
        userPublicKey,
        mintAddress,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
      createMintToInstruction(
        mintAddress,
        userTokenAccount,
        userPublicKey,
        BigInt(initialSupply) * (BigInt(10) ** BigInt(decimals))
      ),
      createSetAuthorityInstruction(
        mintAddress,
        userPublicKey,
        AuthorityType.MintTokens,
        null
      )
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    
    // Setup transaction 1
    transaction1.recentBlockhash = blockhash;
    transaction1.feePayer = userPublicKey;
    transaction1.partialSign(mintKeypair);

    // Setup transaction 2  
    transaction2.recentBlockhash = blockhash;
    transaction2.feePayer = userPublicKey;

    // Serialize transactions
    const serializedTransaction1 = transaction1.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const serializedTransaction2 = transaction2.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return jsonResponse({
      success: true,
      requiresUserSigning: true,
      mintAddress: mintAddress.toBase58(),
      userTokenAccount: userTokenAccount.toBase58(),
      transactions: [
        Array.from(serializedTransaction1),
        Array.from(serializedTransaction2)
      ],
      estimatedCost: totalCost / 1e9, // Convert to SOL
      instructions: {
        steps: [
          "Create and initialize mint",
          "Create token account and mint tokens"
        ],
        totalSteps: 2
      }
    });

  } catch (err: any) {
    console.error("ERR:create-token", err?.message, err?.stack, err?.logs);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});