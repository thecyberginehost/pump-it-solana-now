import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  Keypair,
  sendAndConfirmTransaction,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
  getMint,
  createSetAuthorityInstruction,
  AuthorityType,
} from "https://esm.sh/@solana/spl-token@0.4.8";

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to find metadata PDA
function findMetadataPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
}

// Create metadata instruction
function createMetadataInstruction(
  mint: PublicKey,
  metadata: PublicKey,
  updateAuthority: PublicKey,
  mintAuthority: PublicKey,
  payer: PublicKey,
  name: string,
  symbol: string,
  uri: string
) {
  const keys = [
    { pubkey: metadata, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: mintAuthority, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: updateAuthority, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const nameBuffer = Buffer.alloc(32);
  nameBuffer.write(name);
  
  const symbolBuffer = Buffer.alloc(10);
  symbolBuffer.write(symbol);
  
  const uriBuffer = Buffer.alloc(200);
  uriBuffer.write(uri);

  const data = Buffer.concat([
    Buffer.from([0]), // CreateMetadataAccountV3 instruction discriminator
    nameBuffer,
    symbolBuffer,
    uriBuffer,
    Buffer.from([0, 0]), // seller_fee_basis_points (0%)
    Buffer.from([1]), // update_authority_is_signer
    Buffer.from([1]), // is_mutable
  ]);

  return {
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  };
}

// Base58 decoding for Phantom wallet private keys
function base58Decode(str: string): Uint8Array {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const base = alphabet.length;
  
  let num = BigInt(0);
  let multi = BigInt(1);
  
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str[i];
    const index = alphabet.indexOf(char);
    if (index === -1) throw new Error('Invalid base58 character');
    num += BigInt(index) * multi;
    multi *= BigInt(base);
  }
  
  // Convert bigint to bytes
  const bytes: number[] = [];
  while (num > 0) {
    bytes.unshift(Number(num % BigInt(256)));
    num = num / BigInt(256);
  }
  
  // Handle leading zeros
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.unshift(0);
  }
  
  return new Uint8Array(bytes);
}

/**
 * Creates metadata JSON and uploads it to Supabase storage
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
          value: "Meme Token"
        },
        {
          trait_type: "Network",
          value: "Solana"
        },
        {
          trait_type: "Standard",
          value: "SPL Token"
        }
      ]
    };

    // Generate unique filename for metadata
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2);
    const fileName = `metadata-${timestamp}-${randomString}.json`;

    // Upload metadata JSON to Supabase storage
    const { data, error } = await supabase.storage
      .from('token-images')
      .upload(fileName, JSON.stringify(metadata), {
        contentType: 'application/json'
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('token-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Metadata creation failed:', error);
    return '';
  }
}

/**
 * Edge function to create token transactions for user signing
 */

serve(async (req) => {
  console.log('=== CREATE TOKEN REQUEST START ===');
  console.log('Received request:', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { name, symbol, imageUrl, walletAddress, description, telegramUrl, xUrl, initialBuyIn, freeze = false } = await req.json();

    console.log('Processing token creation:', { name, symbol, walletAddress });

    if (!name || !symbol || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, symbol, or walletAddress' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use public devnet RPC instead of Alchemy to avoid blacklists
    const rpcUrl = 'https://api.devnet.solana.com';
    console.log('Using RPC:', rpcUrl);
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Create metadata
    const metadataUri = await createTokenMetadata(supabase, {
      name,
      symbol,
      description,
      imageUrl,
      telegramUrl,
      xUrl
    });

    // Create token transaction for user to sign
    console.log('Creating token transaction for user wallet:', walletAddress);
    
    // Generate mint keypair for the new token
    const mintKeypair = Keypair.generate();
    const mintAddress = mintKeypair.publicKey;
    const userPublicKey = new PublicKey(walletAddress);
    
    console.log('Generated mint address:', mintAddress.toString());

    // Build transaction that user will sign
    const transaction = new Transaction();
    
    // Calculate rent for mint account
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);
    
    // Add platform creation fee (0.02 SOL)
    const platformFee = 0.02 * LAMPORTS_PER_SOL;
    const platformWallet = new PublicKey('DZm7tfhk7di4GG7XhSXzHJu5dduB4o91paKHQgcvNSAF'); // Replace with actual platform wallet
    
    // Add platform fee transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: platformWallet,
        lamports: platformFee,
      })
    );
    
    // Create mint account instruction
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: userPublicKey,
        newAccountPubkey: mintAddress,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );
    
    // Initialize mint instruction
    transaction.add(
      createInitializeMint2Instruction(
        mintAddress,
        9, // decimals
        userPublicKey, // mint authority (user owns the token)
        null, // freeze authority (null = community safe)
        TOKEN_PROGRAM_ID
      )
    );

    // Get user's associated token account
    const userTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      userPublicKey
    );

    // Create associated token account instruction
    transaction.add(
      createAssociatedTokenAccountInstruction(
        userPublicKey, // payer
        userTokenAccount, // associated token account
        userPublicKey, // owner
        mintAddress // mint
      )
    );

    // Mint initial supply (1 billion tokens)
    const totalSupply = BigInt(1_000_000_000) * BigInt(10 ** 9);
    transaction.add(
      createMintToInstruction(
        mintAddress,
        userTokenAccount,
        userPublicKey,
        totalSupply
      )
    );

    // Add Metaplex Token Metadata (this makes tokens show proper names!)
    const [metadataPda] = findMetadataPda(mintAddress);
    const metadataInstruction = createMetadataInstruction(
      mintAddress,
      metadataPda,
      userPublicKey, // update authority
      userPublicKey, // mint authority
      userPublicKey, // payer
      name,
      symbol,
      metadataUri
    );
    
    transaction.add(metadataInstruction);

    // Disable mint authority (make it immutable)
    transaction.add(
      createSetAuthorityInstruction(
        mintAddress,
        userPublicKey,
        AuthorityType.MintTokens,
        null,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Get recent blockhash and set fee payer
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    // Partially sign with mint keypair (user will sign with their wallet)
    transaction.partialSign(mintKeypair);

    // Serialize transaction for frontend to sign
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    console.log('Transaction created successfully for user to sign');

    // Store token in database (with pending status until transaction is confirmed)
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
        market_cap: 0,
        price: 0,
        volume_24h: 0,
        holder_count: 1,
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

    console.log('Token preparation successful:', tokenData);

    return new Response(
      JSON.stringify({
        success: true,
        requiresSignature: true,
        transaction: Array.from(serializedTransaction), // Send as array for easier handling
        mintAddress: mintAddress.toString(),
        token: {
          ...tokenData,
          contract_address: mintAddress.toString(),
        },
        metadataUri: metadataUri,
        message: `Transaction prepared for "${name}" token creation. Please sign to complete.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating token:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});