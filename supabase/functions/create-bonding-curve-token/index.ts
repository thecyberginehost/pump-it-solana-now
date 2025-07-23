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
  const url = `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
  return new Connection(url, { commitment: "confirmed" });
}

function getPlatformKeypair(): Keypair {
  const raw = getEnv("PLATFORM_WALLET_PRIVATE_KEY").trim();
  return Keypair.fromSecretKey(bs58.decode(raw));
}

// ---------- Request Types ----------
interface CreateCurveTokenRequest {
  name: string;
  symbol: string;
  decimals?: number;        // default 9
  totalSupply?: number;     // how many tokens to mint into the pool at start (whole tokens)
  curveConfig?: {
    // put whatever params you need for your curve
    startingPriceLamports?: number;
    slopeBps?: number;
    feeBps?: number;
  };
}

// ---------- Main ----------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);

  let body: CreateCurveTokenRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const {
    name,
    symbol,
    decimals = 9,
    totalSupply = 0,
    curveConfig = {},
  } = body;

  if (!name || !symbol) {
    return jsonResponse({ error: "name and symbol required" }, 400);
  }

  const connection = getConnection();
  const platform = getPlatformKeypair();

  try {
    // 1. Create mint
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
      platform.publicKey, // freeze authority (revoke later)
      TOKEN_PROGRAM_ID
    );

    // 2. Create internal bonding-curve pool token account (owned by your curve program or the platform)
    //    Option A: Use an ATA owned by a pool PDA
    //    Option B: Custom PDA via your program (recommended)
    //
    // For simplicity, let's assume you use a PDA from your bonding curve program.
    // Replace PROGRAM_ID, seeds, and logic as needed.

    const BONDING_PROGRAM_ID = new PublicKey("11111111111111111111111111111111"); // TODO replace
    const [poolPda] = await PublicKey.findProgramAddress(
      [Buffer.from("pool"), mintKeypair.publicKey.toBuffer()],
      BONDING_PROGRAM_ID
    );

    const poolAta = await PublicKey.findProgramAddress(
      [
        poolPda.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    ).then(([addr]) => addr);

    const createPoolAtaIx = createAssociatedTokenAccountInstruction(
      platform.publicKey,   // payer
      poolAta,
      poolPda,              // owner
      mintKeypair.publicKey,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // 3. Mint initial supply into the pool
    const mintAmount = BigInt(totalSupply) * BigInt(10 ** decimals);
    const mintToPoolIx = totalSupply > 0
      ? createMintToInstruction(
          mintKeypair.publicKey,
          poolAta,
          platform.publicKey,
          mintAmount
        )
      : null;

    // 4. Initialize/seed your bonding curve state (TODO: your custom program ix)
    //    Usually you'll send an ix to your on-chain curve program to store prices, slope, fees, etc.
    const initCurveIx = SystemProgram.nop(); // placeholder
    // TODO: Replace above with real instruction(s) to your curve program.

    // 5. Build and send tx
    const instructions = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 600000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
      createMintIx,
      initMintIx,
      createPoolAtaIx,
      ...(mintToPoolIx ? [mintToPoolIx] : []),
      initCurveIx,
    ];

    const tx = new Transaction().add(...instructions);
    tx.feePayer = platform.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.partialSign(mintKeypair, platform);

    const sig = await sendAndConfirmTransaction(connection, tx, [mintKeypair, platform], {
      commitment: "confirmed",
    });

    // 6. Revoke mint & freeze authorities so trading is only via your pool logic
    await setAuthority(
      connection,
      platform,
      mintKeypair.publicKey,
      platform.publicKey,
      AuthorityType.MintTokens,
      null
    );
    await setAuthority(
      connection,
      platform,
      mintKeypair.publicKey,
      platform.publicKey,
      AuthorityType.FreezeAccount,
      null
    );

    return jsonResponse({
      success: true,
      mint: mintKeypair.publicKey.toBase58(),
      poolPda: poolPda.toBase58(),
      poolAta: poolAta.toBase58(),
      name,
      symbol,
      decimals,
      totalSupply,
      curveConfig,
      txSig: sig,
      authoritiesRevoked: true,
    });
  } catch (err) {
    console.error("ERR:create-bonding-curve-token", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
