import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();
    
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const alchemyRpcUrl = Deno.env.get('ALCHEMY_RPC_URL');
    if (!alchemyRpcUrl) {
      throw new Error('Alchemy RPC URL not configured');
    }

    console.log('Fetching balance for wallet:', walletAddress);

    // Get SOL balance using Alchemy RPC
    const response = await fetch(alchemyRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [walletAddress]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    // Convert lamports to SOL
    const balanceInLamports = data.result?.value || 0;
    const balanceInSol = balanceInLamports / 1000000000; // 1 SOL = 1 billion lamports

    console.log('Wallet balance fetched:', balanceInSol, 'SOL');

    // Calculate suggested buy-in amount based on balance
    let suggestedBuyIn = 0;
    
    if (balanceInSol > 10) {
      // If they have more than 10 SOL, suggest 30% but cap at reasonable amount
      suggestedBuyIn = Math.min(balanceInSol * 0.3, 50);
    } else if (balanceInSol > 5) {
      // If they have 5-10 SOL, suggest 25%
      suggestedBuyIn = balanceInSol * 0.25;
    } else if (balanceInSol > 2) {
      // If they have 2-5 SOL, suggest 20%
      suggestedBuyIn = balanceInSol * 0.2;
    } else if (balanceInSol > 1) {
      // If they have 1-2 SOL, suggest 15%
      suggestedBuyIn = balanceInSol * 0.15;
    } else if (balanceInSol > 0.5) {
      // If they have 0.5-1 SOL, suggest 10%
      suggestedBuyIn = balanceInSol * 0.1;
    }
    
    // Always leave at least 0.1 SOL for transaction fees
    const maxSafeBuyIn = Math.max(0, balanceInSol - 0.1);
    suggestedBuyIn = Math.min(suggestedBuyIn, maxSafeBuyIn);
    
    // Round to reasonable decimal places
    suggestedBuyIn = Math.round(suggestedBuyIn * 10000) / 10000;

    return new Response(
      JSON.stringify({ 
        balance: balanceInSol,
        suggestedBuyIn,
        maxSafeBuyIn
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch wallet balance',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});