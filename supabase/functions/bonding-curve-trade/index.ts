import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "https://esm.sh/@solana/web3.js@1.95.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bonding curve constants
const BONDING_CURVE_CONFIG = {
  TOTAL_SUPPLY: 1_000_000_000,
  BONDING_CURVE_SUPPLY: 800_000_000,
  GRADUATION_THRESHOLD: 69_000,
  VIRTUAL_SOL_RESERVES: 30,
  VIRTUAL_TOKEN_RESERVES: 1_073_000_000,
};

interface BondingCurveTradeRequest {
  tokenId: string;
  tradeType: 'buy' | 'sell';
  solAmount?: number;
  tokenAmount?: number;
  walletAddress: string;
  expectedTokensOut?: number;
  expectedSolOut?: number;
}

interface BondingCurveState {
  solRaised: number;
  tokensSold: number;
  virtualSolReserves: number;
  virtualTokenReserves: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const request: BondingCurveTradeRequest = await req.json();
    
    console.log(`Processing bonding curve ${request.tradeType} for token ${request.tokenId}:`, {
      tradeType: request.tradeType,
      solAmount: request.solAmount,
      tokenAmount: request.tokenAmount,
      walletAddress: request.walletAddress
    });

    // Get token details
    const { data: token, error: tokenError } = await supabaseClient
      .from('tokens')
      .select('*')
      .eq('id', request.tokenId)
      .single();

    if (tokenError || !token) {
      throw new Error(`Token not found: ${tokenError?.message}`);
    }

    // Check if token is app-created
    if (!token.mint_address) {
      throw new Error('Only tokens created through our platform can be traded on bonding curve');
    }

    // Get current bonding curve state
    const currentState: BondingCurveState = {
      solRaised: token.sol_raised || 0,
      tokensSold: token.tokens_sold || 0,
      virtualSolReserves: BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES + (token.sol_raised || 0),
      virtualTokenReserves: BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES - (token.tokens_sold || 0),
    };

    console.log('Current bonding curve state:', currentState);

    // Check if graduated
    const currentPrice = currentState.virtualSolReserves / currentState.virtualTokenReserves;
    const currentMarketCap = currentPrice * BONDING_CURVE_CONFIG.TOTAL_SUPPLY;
    
    if (currentMarketCap >= BONDING_CURVE_CONFIG.GRADUATION_THRESHOLD) {
      throw new Error('Token has graduated to Raydium! Please trade on external DEX platforms.');
    }

    let transaction: any;
    let newState: BondingCurveState;

    if (request.tradeType === 'buy') {
      if (!request.solAmount) {
        throw new Error('SOL amount required for buy orders');
      }

      // Calculate tokens out using constant product formula
      const k = currentState.virtualSolReserves * currentState.virtualTokenReserves;
      const newSolReserves = currentState.virtualSolReserves + request.solAmount;
      const newTokenReserves = k / newSolReserves;
      const tokensOut = currentState.virtualTokenReserves - newTokenReserves;

      // Check if we have enough tokens remaining
      const tokensRemaining = BONDING_CURVE_CONFIG.BONDING_CURVE_SUPPLY - currentState.tokensSold;
      if (tokensOut > tokensRemaining) {
        throw new Error(`Insufficient tokens remaining. Only ${tokensRemaining.toFixed(0)} tokens available.`);
      }

      // Validate against expected output (5% tolerance)
      if (request.expectedTokensOut && Math.abs(tokensOut - request.expectedTokensOut) / request.expectedTokensOut > 0.05) {
        throw new Error('Price has changed significantly. Please refresh and try again.');
      }

      newState = {
        solRaised: currentState.solRaised + request.solAmount,
        tokensSold: currentState.tokensSold + tokensOut,
        virtualSolReserves: newSolReserves,
        virtualTokenReserves: newTokenReserves,
      };

      transaction = {
        type: 'buy',
        solIn: request.solAmount,
        tokensOut: tokensOut,
        priceAfter: newSolReserves / newTokenReserves,
        marketCapAfter: (newSolReserves / newTokenReserves) * BONDING_CURVE_CONFIG.TOTAL_SUPPLY,
      };

    } else if (request.tradeType === 'sell') {
      if (!request.tokenAmount) {
        throw new Error('Token amount required for sell orders');
      }

      // Calculate SOL out using constant product formula
      const k = currentState.virtualSolReserves * currentState.virtualTokenReserves;
      const newTokenReserves = currentState.virtualTokenReserves + request.tokenAmount;
      const newSolReserves = k / newTokenReserves;
      const solOut = currentState.virtualSolReserves - newSolReserves;

      // Validate against expected output (5% tolerance)
      if (request.expectedSolOut && Math.abs(solOut - request.expectedSolOut) / request.expectedSolOut > 0.05) {
        throw new Error('Price has changed significantly. Please refresh and try again.');
      }

      newState = {
        solRaised: Math.max(0, currentState.solRaised - solOut),
        tokensSold: Math.max(0, currentState.tokensSold - request.tokenAmount),
        virtualSolReserves: newSolReserves,
        virtualTokenReserves: newTokenReserves,
      };

      transaction = {
        type: 'sell',
        tokensIn: request.tokenAmount,
        solOut: solOut,
        priceAfter: newSolReserves / newTokenReserves,
        marketCapAfter: (newSolReserves / newTokenReserves) * BONDING_CURVE_CONFIG.TOTAL_SUPPLY,
      };
    } else {
      throw new Error('Invalid trade type');
    }

    console.log('Calculated transaction:', transaction);
    console.log('New bonding curve state:', newState);

    // Simulate blockchain transaction
    const connection = new Connection(
      Deno.env.get('ALCHEMY_RPC_URL') || 'https://api.devnet.solana.com'
    );

    // Generate mock transaction signature
    const mockSignature = `bonding_curve_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Calculate fees (1% of trade amount)
    const feeRate = 0.01;
    let totalFeeAmount: number;
    
    if (request.tradeType === 'buy') {
      totalFeeAmount = request.solAmount! * feeRate;
    } else {
      totalFeeAmount = transaction.solOut * feeRate;
    }

    // Process fees
    try {
      await supabaseClient.functions.invoke('process-trading-fees', {
        body: {
          tokenId: request.tokenId,
          transactionType: request.tradeType,
          tradeAmount: request.tradeType === 'buy' ? request.solAmount : transaction.solOut,
          traderWallet: request.walletAddress,
          totalFeeAmount: totalFeeAmount,
        },
      });
    } catch (feeError) {
      console.warn('Fee processing failed:', feeError);
      // Continue with trade even if fee processing fails
    }

    // Update token state in database
    const { error: updateError } = await supabaseClient
      .from('tokens')
      .update({
        sol_raised: newState.solRaised,
        tokens_sold: newState.tokensSold,
        price: transaction.priceAfter,
        market_cap: transaction.marketCapAfter,
        volume_24h: (token.volume_24h || 0) + (request.tradeType === 'buy' ? request.solAmount! : transaction.solOut),
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.tokenId);

    if (updateError) {
      console.error('Failed to update token state:', updateError);
      throw new Error('Failed to update token state');
    }

    // Record trading activity
    await supabaseClient
      .from('trading_activities')
      .insert({
        user_wallet: request.walletAddress,
        token_id: request.tokenId,
        activity_type: request.tradeType,
        amount_sol: request.tradeType === 'buy' ? request.solAmount! : transaction.solOut,
        token_amount: request.tradeType === 'buy' ? transaction.tokensOut : request.tokenAmount!,
        token_price: transaction.priceAfter,
        market_cap_at_time: transaction.marketCapAfter,
      });

    // Update user portfolio
    await supabaseClient
      .from('user_portfolios')
      .upsert({
        user_wallet: request.walletAddress,
        token_id: request.tokenId,
        token_amount: request.tradeType === 'buy' ? 
          (await supabaseClient
            .from('user_portfolios')
            .select('token_amount')
            .eq('user_wallet', request.walletAddress)
            .eq('token_id', request.tokenId)
            .single()
          ).data?.token_amount || 0 + transaction.tokensOut :
          Math.max(0, (await supabaseClient
            .from('user_portfolios')
            .select('token_amount')
            .eq('user_wallet', request.walletAddress)
            .eq('token_id', request.tokenId)
            .single()
          ).data?.token_amount || 0 - request.tokenAmount!),
        total_invested: request.tradeType === 'buy' ? request.solAmount! : 0,
        average_buy_price: transaction.priceAfter,
        last_activity_at: new Date().toISOString(),
      }, {
        onConflict: 'user_wallet,token_id'
      });

    console.log(`Successfully processed bonding curve ${request.tradeType} transaction`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          signature: mockSignature,
          type: request.tradeType,
          solAmount: request.tradeType === 'buy' ? request.solAmount : transaction.solOut,
          tokenAmount: request.tradeType === 'buy' ? transaction.tokensOut : request.tokenAmount,
          tokensReceived: request.tradeType === 'buy' ? transaction.tokensOut : 0,
          solReceived: request.tradeType === 'sell' ? transaction.solOut : 0,
          priceAfter: transaction.priceAfter,
          marketCapAfter: transaction.marketCapAfter,
          fee: totalFeeAmount,
          timestamp: new Date().toISOString(),
        },
        bondingCurveState: newState,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Bonding curve trade error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});