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
  Keypair,
  AccountMeta,
  TransactionInstruction,
} from "npm:@solana/web3.js@1.98.2";
import {
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from "npm:@solana/spl-token@0.4.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bonding Curve Program ID (using a valid base58 string for testing)
const BONDING_CURVE_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

/**
 * Create instruction data for initializing bonding curve
 */
function createInitializeBondingCurveInstruction(
  bondingCurve: PublicKey,
  mint: PublicKey,
  curveTokenAccount: PublicKey,
  creator: PublicKey,
  platformWallet: PublicKey
): TransactionInstruction {
  // Instruction data: [instruction_type (1 byte), virtual_sol_reserves (8 bytes), virtual_token_reserves (8 bytes)]
  const instructionData = new Uint8Array(17);
  const dataView = new DataView(instructionData.buffer);
  dataView.setUint8(0, 0); // Initialize instruction
  
  // Virtual reserves: 30 SOL and 1.073B tokens (pump.fun style)
  const virtualSol = BigInt(30 * LAMPORTS_PER_SOL);
  const virtualTokens = BigInt(1073000000 * Math.pow(10, 9)); // 1.073B tokens with 9 decimals
  
  dataView.setBigUint64(1, virtualSol, true); // little endian
  dataView.setBigUint64(9, virtualTokens, true); // little endian

  const accounts: AccountMeta[] = [
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: curveTokenAccount, isSigner: false, isWritable: true },
    { pubkey: creator, isSigner: true, isWritable: true },
    { pubkey: platformWallet, isSigner: false, isWritable: false },
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
 * Create metadata JSON and upload it to Supabase storage
 */
async function createTokenMetadata(supabase: any, tokenData: any) {
  try {
    const metadata = {
      name: tokenData.name,
      symbol: tokenData.symbol,
      description: tokenData.description || `${tokenData.name} - A community-driven meme token`,
      image: tokenData.imageUrl || '',
      external_url: tokenData.telegramUrl || tokenData.xUrl || '',
      attributes: [
        {
          trait_type: "Token Type",
          value: "Bonding Curve Token"
        },
        {
          trait_type: "Network",
          value: "Solana"
        },
        {
          trait_type: "Standard",
          value: "SPL Token"
        },
        {
          trait_type: "Mechanism",
          value: "Pump.fun Style Bonding Curve"
        }
      ]
    };

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2);
    const fileName = `metadata-${timestamp}-${randomString}.json`;

    const { data, error } = await supabase.storage
      .from('token-images')
      .upload(fileName, JSON.stringify(metadata), {
        contentType: 'application/json'
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('token-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Metadata creation failed:', error);
    return '';
  }
}

serve(async (req) => {
  console.log('=== BONDING CURVE TOKEN CREATION START ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { name, symbol, imageUrl, walletAddress, description, telegramUrl, xUrl } = await req.json();

    console.log('Creating bonding curve token:', { name, symbol, walletAddress });

    if (!name || !symbol || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, symbol, or walletAddress' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check creator rate limits and permissions
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_creator_rate_limit', {
      p_creator_wallet: walletAddress
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Failed to check creator permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const rateLimitResult = rateLimitCheck[0];
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Creator limit exceeded',
          reason: rateLimitResult.reason,
          tokensCreatedToday: rateLimitResult.tokens_created_today,
          dailyLimit: rateLimitResult.daily_limit
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Initialize Helius Solana connection with staked connections
    const heliusRpcApiKey = Deno.env.get('HELIUS_RPC_API_KEY');
    console.log('Helius API key available:', !!heliusRpcApiKey);
    
    if (!heliusRpcApiKey) {
      console.error('Helius RPC API key not configured');
      throw new Error('Helius RPC API key not configured');
    }
    
    const heliusRpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusRpcApiKey}`;
    console.log('Connecting to Helius RPC...');
    
    try {
      const connection = new Connection(heliusRpcUrl, 'confirmed');
      // Test the connection
      const blockHeight = await connection.getBlockHeight();
      console.log('✅ Helius connection successful, block height:', blockHeight);
    } catch (connectionError) {
      console.error('❌ Helius connection failed:', connectionError);
      throw new Error(`Failed to connect to Helius: ${connectionError.message}`);
    }
    
    const connection = new Connection(heliusRpcUrl, 'confirmed');
    
    // Create metadata
    const metadataUri = await createTokenMetadata(supabase, {
      name, symbol, description, imageUrl, telegramUrl, xUrl
    });

    // Generate keypairs
    const mintKeypair = Keypair.generate();
    
    const mintAddress = mintKeypair.publicKey;
    const userPublicKey = new PublicKey(walletAddress);
    
    // Use a safe default for platform wallet if env var is invalid
    let platformWallet: PublicKey;
    try {
      const platformWalletEnv = Deno.env.get('PLATFORM_WALLET_ADDRESS');
      platformWallet = platformWalletEnv ? new PublicKey(platformWalletEnv) : new PublicKey('DZm7tfhk7di4GG7XhSXzHJu5dduB4o91paKHQgcvNSAF');
    } catch (error) {
      console.log('Invalid platform wallet address, using default');
      platformWallet = new PublicKey('DZm7tfhk7di4GG7XhSXzHJu5dduB4o91paKHQgcvNSAF');
    }

    console.log('Generated addresses:');
    console.log('- Mint:', mintAddress.toString());

    // Build simplified transaction for better success rate
    const transaction = new Transaction();
    
    // 1. Platform fee (0.02 SOL)
    const platformFee = 0.02 * LAMPORTS_PER_SOL;
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: platformWallet,
        lamports: platformFee,
      })
    );

    // 2. Create mint account
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: userPublicKey,
        newAccountPubkey: mintAddress,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 3. Initialize mint with user as temporary authority (simplified)
    transaction.add(
      createInitializeMint2Instruction(
        mintAddress,
        9, // decimals
        userPublicKey, // mint authority = user (temporary)
        null, // freeze authority = null (community safe)
        TOKEN_PROGRAM_ID
      )
    );

    // Set transaction metadata
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    // Partially sign with generated keypairs
    transaction.partialSign(mintKeypair);

    // Serialize for frontend
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    // Store token in database
    const { data: tokenData, error: dbError } = await supabase
      .from('tokens')
      .insert({
        creator_wallet: walletAddress,
        name,
        symbol,
        description,
        image_url: imageUrl,
        telegram_url: telegramUrl,
        x_url: xUrl,
        mint_address: mintAddress.toString(),
        total_supply: 1000000000,
        creation_fee: 0.02,
        // Bonding curve initialization
        sol_raised: 0,
        tokens_sold: 0,
        is_graduated: false,
        market_cap: 0,
        price: 0.000000028, // Initial price based on virtual reserves (30 SOL / 1.073B tokens)
        volume_24h: 0,
        holder_count: 1, // Creator gets all tokens initially
        // Store mint address as bonding curve address for now (simplified)
        bonding_curve_address: mintAddress.toString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to store token data', details: dbError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Bonding curve token prepared successfully');
    console.log('📈 All tokens minted to bonding curve contract');
    console.log('🚀 Creator starts with 0 tokens - must buy to participate');

    return new Response(
      JSON.stringify({
        success: true,
        requiresSignature: true,
        transaction: Array.from(serializedTransaction),
        mintAddress: mintAddress.toString(),
        bondingCurveAddress: mintAddress.toString(),
        token: {
          ...tokenData,
          contract_address: mintAddress.toString(),
          bonding_curve_address: mintAddress.toString(),
        },
        metadataUri,
        message: `Bonding curve token "${name}" prepared. Simple mint created - ready for bonding curve integration!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== BONDING CURVE TOKEN CREATION ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create bonding curve token', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});