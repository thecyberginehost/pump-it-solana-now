import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  createCreateMetadataAccountV3Instruction,
  DataV2,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from "https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.2.1";

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

function getMetadataPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);

    const body = await req.json().catch(() => null);
    if (!body) return jsonResponse({ error: "Invalid JSON body" }, 400);

    const { mintAddress, name, symbol, description, imageUrl } = body;
    if (!mintAddress || !name || !symbol) {
      return jsonResponse({ error: "mintAddress, name, and symbol required" }, 400);
    }

    console.log(`Creating metadata for token: ${name} (${symbol})`);

    const connection = getConnection();
    
    // Get platform keypair for paying transaction fees
    const platformPrivateKey = getEnv("PLATFORM_WALLET_PRIVATE_KEY");
    let platformKeypair: Keypair;
    
    try {
      // Try parsing as JSON array first
      const privateKeyArray = JSON.parse(platformPrivateKey);
      platformKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
    } catch (jsonError) {
      // If JSON parsing fails, try as base58 string
      try {
        const bs58 = await import('https://esm.sh/bs58@5.0.0');
        const decoded = bs58.default.decode(platformPrivateKey);
        platformKeypair = Keypair.fromSecretKey(decoded);
      } catch (base64Error) {
        console.error('Private key format error:', { jsonError, base64Error });
        throw new Error('Invalid private key format. Must be JSON array or base58 string.');
      }
    }

    const mint = new PublicKey(mintAddress);
    const [metadataPDA] = getMetadataPDA(mint);

    // Create metadata
    const metadataData: DataV2 = {
      name: name,
      symbol: symbol,
      uri: imageUrl || "", // In production, upload JSON metadata to Arweave/IPFS
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    };

    const instruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mint,
        mintAuthority: platformKeypair.publicKey,
        payer: platformKeypair.publicKey,
        updateAuthority: platformKeypair.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: metadataData,
          isMutable: true,
          collectionDetails: null,
        },
      }
    );

    const transaction = new Transaction().add(instruction);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = platformKeypair.publicKey;

    console.log("Sending metadata transaction...");
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [platformKeypair]
    );

    console.log(`✅ Metadata created successfully: ${signature}`);

    return jsonResponse({
      success: true,
      signature,
      metadataPDA: metadataPDA.toBase58(),
      message: "Token metadata uploaded to Solana successfully!"
    });

  } catch (err: any) {
    console.error("ERR:upload-metadata", err?.message, err?.stack);
    return jsonResponse({ error: err?.message ?? "Unknown error" }, 500);
  }
});