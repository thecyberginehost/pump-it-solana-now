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
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
} from "https://esm.sh/@solana/spl-token@0.4.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      'https://llvakqunvvheajwejpzm.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsdmFrcXVudnZoZWFqd2VqcHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTYxNjksImV4cCI6MjA2ODQ3MjE2OX0.B4G2bqu9muRFuviZRt7bs80UUVEVy5nbO0p55z7vmlQ'
    );

    const { name, symbol, imageUrl, walletAddress, description } = await req.json();

    if (!name || !symbol || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, symbol, or walletAddress' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Creating token:', { name, symbol, walletAddress });

    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Generate a new mint address
    const mintKeypair = await crypto.subtle.generateKey(
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      true,
      ['sign', 'verify']
    );
    
    // For now, we'll create a mock mint address and store the token info
    // In production, you'd use the actual Solana token creation process
    const mockMintAddress = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store token in database
    const { data: tokenData, error: dbError } = await supabase
      .from('tokens')
      .insert({
        creator_wallet: walletAddress,
        name,
        symbol,
        description,
        image_url: imageUrl,
        mint_address: mockMintAddress,
        total_supply: 1000000000, // 1B tokens
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

    // Update creator's token count
    await supabase
      .from('profiles')
      .update({ 
        total_tokens_created: supabase.rpc('increment_tokens_created', { wallet: walletAddress })
      })
      .eq('wallet_address', walletAddress);

    console.log('Token created successfully:', tokenData);

    return new Response(
      JSON.stringify({
        success: true,
        token: tokenData,
        mintAddress: mockMintAddress,
        message: 'Token created successfully! (Currently in development mode)',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating token:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});