
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAchievements } from './useAchievements';

export interface TradeRequest {
  tokenId: string;
  tradeType: 'buy' | 'sell';
  amount: number;
  walletAddress: string;
  slippage?: number;
}

export interface TradeResult {
  signature: string;
  type: 'buy' | 'sell';
  amount: number;
  tokensReceived: number;
  solReceived: number;
  fee: number;
  timestamp: string;
}

export const useTrading = () => {
  const queryClient = useQueryClient();
  const [isTrading, setIsTrading] = useState(false);
  const { checkAchievements } = useAchievements();

  const executeTrade = useMutation({
    mutationFn: async (tradeRequest: TradeRequest): Promise<TradeResult> => {
      const { data, error } = await supabase.functions.invoke('execute-trade', {
        body: tradeRequest,
      });

      if (error) throw error;
      return data.transaction;
    },
    onSuccess: (data, variables) => {
      const action = variables.tradeType === 'buy' ? 'bought' : 'sold';
      const amount = variables.tradeType === 'buy' 
        ? `${data.tokensReceived.toFixed(2)} tokens` 
        : `${data.solReceived.toFixed(3)} SOL`;
      
      toast.success(`Successfully ${action} ${amount}!`);
      
      // Check for trading achievements
      checkAchievements({
        userWallet: variables.walletAddress,
        checkType: 'trading',
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      queryClient.invalidateQueries({ queryKey: ['token', variables.tokenId] });
      queryClient.invalidateQueries({ queryKey: ['recent-tokens'] });
    },
    onError: (error: any) => {
      console.error('Trading error:', error);
      
      // Handle specific error types
      if (error?.message?.includes('graduated')) {
        toast.error('Token has graduated to Raydium! Please trade on external DEX platforms.');
      } else if (error?.message?.includes('Invalid token')) {
        toast.error('This token cannot be traded here. Only tokens created through our platform are supported.');
      } else {
        toast.error(error?.message || 'Trade failed');
      }
    },
  });

  const handleTrade = async (tradeRequest: TradeRequest) => {
    if (!tradeRequest.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (tradeRequest.amount <= 0) {
      toast.error('Trade amount must be greater than 0');
      return;
    }

    setIsTrading(true);
    try {
      return await executeTrade.mutateAsync(tradeRequest);
    } finally {
      setIsTrading(false);
    }
  };

  return {
    executeTrade: handleTrade,
    isTrading: isTrading || executeTrade.isPending,
    error: executeTrade.error,
  };
};
