// supabase/functions/create-token/index.ts
// Creates a plain SPL token (no bonding curve), revokes mint/freeze authorities Pump.fun-style.

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
} from "https://esm.sh/@solana/spl-token@0.4.6";
import bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// ---------- Helpers ----------
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
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, { commitment: "confirmed" });
}

function getPlatformKeypair(): Keypair {
  const raw = getEnv("PLATFORM_WALLET_PRIVATE_KEY").trim();
  return Keypair.fromSecretKey(bs58.decode(raw));
}

// ---------- Request Types ----------
interface CreateTokenRequest {
  name: string;          // e.g. "MoonForge Token"
  symbol: string;        // e.g. "MOON"
  decimals?: number;     // default 9
  initialSupply?: number;// optional initial supply in whole tokens
  receiver?: string;     // optional wallet to receive initial supply
}

// ---------- Main ----------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Use POST" }, 405);
    }

    let body: CreateTokenRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const {
      name,
      symbol,
      decimals = 9,
      initialSupply = 0,
      receiver,
    } = body;

    if (!name || !symbol) {
      return jsonResponse({ error: "name and symbol required" }, 400);
    }

    const connection = getConnection();
    const platform = getPlatformKeypair();

    // 1. Create mint account
    const mintKeypair = Keypair.generate();
    const rentLamports = await getMinimumBalanceForRentExemptMint(connection);

    const createMintIx = SystemProgram.createAccount({
      fromPubkey: platform.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: rentLamports,
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintIx = createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      platform.publicKey,
      platform.publicKey, // freeze authority initially, revoke later
      TOKEN_PROGRAM_ID
    );

    const instructions = [
      // optional: raise compute budget if needed
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
      createMintIx,
      initMintIx,
    ];

    const tx = new Transaction().add(...instructions);
    tx.feePayer = platform.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Partial sign by mint (new account) & platform
    tx.partialSign(mintKeypair, platform);

    const sig1 = await sendAndConfirmTransaction(connection, tx, [mintKeypair, platform], {
      commitment: "confirmed",
    });

    // 2. If initial supply > 0, mint to receiver (or platform ATA)
    let mintedTo: PublicKey | undefined;
    if (initialSupply > 0) {
      const dest = receiver ? new PublicKey(receiver) : platform.publicKey;

      // Associated token account
      const ata = await PublicKey.findProgramAddress(
        [
          dest.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      ).then(([addr]) => addr);

      const createAtaIx = createAssociatedTokenAccountInstruction(
        platform.publicKey,
        ata,
        dest,
        mintKeypair.publicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const mintToIx = createMintToInstruction(
        mintKeypair.publicKey,
        ata,
        platform.publicKey,
        BigInt(initialSupply) * BigInt(10 ** decimals)
      );

      const tx2 = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        createAtaIx,
        mintToIx
      );
      tx2.feePayer = platform.publicKey;
      tx2.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx2.partialSign(platform);

      const sig2 = await sendAndConfirmTransaction(connection, tx2, [platform], {
        commitment: "confirmed",
      });
      mintedTo = ata;
    }

    // 3. Revoke mint & freeze authorities (Pump.fun posture)
    const revokeMintIx = await setAuthority(
      connection,
      platform, // payer
      mintKeypair.publicKey,
      platform.publicKey,
      AuthorityType.MintTokens,
      null
    );

    const revokeFreezeIx = await setAuthority(
      connection,
      platform,
      mintKeypair.publicKey,
      platform.publicKey,
      AuthorityType.FreezeAccount,
      null
    );

    // setAuthority util above actually sends a tx for you; if you want manual control, use spl-token raw ix instead.
    // But the helper returns signature; you may prefer bundling into one tx.
    // For clarity, we'll leave as-is.

    return jsonResponse({
      success: true,
      mint: mintKeypair.publicKey.toBase58(),
      name,
      symbol,
      decimals,
      initialSupply,
      mintedTo: mintedTo?.toBase58() ?? null,
      tx: {
        createMint: sig1,
        // mintTo included only if supply > 0
      },
      authoritiesRevoked: true,
    });
  } catch (err) {
    console.error("ERR:create-token", {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});