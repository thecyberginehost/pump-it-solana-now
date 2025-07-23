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

// Create simplified metadata instruction (compatible with Deno edge function)
function createSimpleMetadataInstruction(
  mint: PublicKey,
  updateAuthority: PublicKey,
  name: string,
  symbol: string,
  uri: string
) {
  const encoder = new TextEncoder();
  
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      encoder.encode('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  // Create fixed-size byte arrays for metadata (Deno-compatible)
  const nameBytes = new Uint8Array(32);
  const nameEncoded = encoder.encode(name.slice(0, 31));
  nameBytes.set(nameEncoded);
  
  const symbolBytes = new Uint8Array(10);
  const symbolEncoded = encoder.encode(symbol.slice(0, 9));
  symbolBytes.set(symbolEncoded);
  
  const uriBytes = new Uint8Array(200);
  const uriEncoded = encoder.encode(uri.slice(0, 199));
  uriBytes.set(uriEncoded);

  // Build instruction data for CreateMetadataAccountV3
  const instructionData = new Uint8Array(
    1 + // instruction discriminator
    nameBytes.length + 
    symbolBytes.length + 
    uriBytes.length + 
    2 + // seller_fee_basis_points
    1 + // update_authority_is_signer
    1 + // is_mutable
    1 + // collection
    1   // uses
  );

  let offset = 0;
  instructionData[offset] = 0; // CreateMetadataAccountV3 discriminator
  offset += 1;
  
  instructionData.set(nameBytes, offset);
  offset += nameBytes.length;
  
  instructionData.set(symbolBytes, offset);
  offset += symbolBytes.length;
  
  instructionData.set(uriBytes, offset);
  offset += uriBytes.length;
  
  instructionData[offset] = 0; // seller_fee_basis_points (low byte)
  instructionData[offset + 1] = 0; // seller_fee_basis_points (high byte)
  offset += 2;
  
  instructionData[offset] = 1; // update_authority_is_signer
  offset += 1;
  
  instructionData[offset] = 1; // is_mutable
  offset += 1;
  
  instructionData[offset] = 0; // collection
  offset += 1;
  
  instructionData[offset] = 0; // uses

  return {
    keys: [
      { pubkey: metadataPda, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: updateAuthority, isSigner: true, isWritable: false },
      { pubkey: updateAuthority, isSigner: true, isWritable: true }, // payer
      { pubkey: updateAuthority, isSigner: false, isWritable: false }, // update_authority
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: instructionData,
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
  console.log('=== TOKEN CREATION REQUEST ===');
  console.log('🚀 REDIRECTING TO BONDING CURVE TOKEN CREATION');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify HELIUS_KEY environment variable
    const heliusKey = Deno.env.get('HELIUS_KEY');
    console.log('HELIUS_KEY check:', {
      isDefined: heliusKey !== undefined,
      hasValue: !!heliusKey,
      length: heliusKey?.length || 0
    });
    
    if (!heliusKey) {
      console.error('❌ HELIUS_KEY is undefined');
      return new Response(
        JSON.stringify({ 
          error: 'HELIUS_KEY environment variable is not configured',
          details: 'Missing required Helius API key'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request data
    const requestData = await req.json();
    
    console.log('Delegating to bonding curve token creation:', requestData);

    // Call the new bonding curve token creation function with enhanced error handling
    let bondingCurveResponse;
    try {
      bondingCurveResponse = await supabase.functions.invoke('create-bonding-curve-token', {
        body: requestData
      });
    } catch (sendError) {
      console.error('❌ SUPABASE FUNCTION CALL ERROR:', sendError);
      console.error('Send error details:', {
        message: sendError.message,
        stack: sendError.stack,
        name: sendError.name,
        cause: sendError.cause
      });
      
      // Log the actual RPC error body if available
      if (sendError.response) {
        try {
          const errorBody = await sendError.response.text();
          console.error('RPC Error Body:', errorBody);
          return new Response(
            JSON.stringify({ 
              error: 'RPC call failed', 
              details: sendError.message,
              rpcErrorBody: errorBody,
              errorType: 'SUPABASE_FUNCTION_INVOKE_ERROR'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        } catch (parseError) {
          console.error('Could not parse error response body:', parseError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to invoke bonding curve function', 
          details: sendError.message,
          errorType: 'SUPABASE_FUNCTION_INVOKE_ERROR'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (bondingCurveResponse.error) {
      console.error('Bonding curve creation error:', bondingCurveResponse.error);
      console.error('Full error details:', JSON.stringify(bondingCurveResponse.error, null, 2));
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create bonding curve token', 
          details: bondingCurveResponse.error.message || 'Unknown error',
          fullError: bondingCurveResponse.error,
          errorType: 'BONDING_CURVE_ERROR'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Successfully created bonding curve token');
    return new Response(
      JSON.stringify(bondingCurveResponse.data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== TOKEN CREATION ERROR ===');
    console.error('Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        errorType: 'INTERNAL_SERVER_ERROR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});