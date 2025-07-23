
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAchievements } from './useAchievements';
import { useWalletAuth } from './useWalletAuth';
import { Transaction } from '@solana/web3.js';

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
    mutationFn: async (tradeRequest: TradeRequest): Promise<any> => {
      // Use the appropriate bonding curve function based on trade type
      const functionName = tradeRequest.tradeType === 'buy' ? 'bonding-curve-buy' : 'bonding-curve-sell';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          tokenId: tradeRequest.tokenId,
          walletAddress: tradeRequest.walletAddress,
          solAmount: tradeRequest.amount, // For buy, this is SOL amount; for sell, we'll need to convert
        },
      });

      if (error) throw error;
      
      // If the response requires user signature, handle wallet signing
      if (data.requiresSignature && data.transaction) {
        // Get wallet from context
        const wallet = (window as any).solana;
        if (!wallet) {
          throw new Error('Wallet not found');
        }
        
        try {
          // Reconstruct transaction from array
          const transactionArray = new Uint8Array(data.transaction);
          const transaction = Transaction.from(transactionArray);
          
          // Sign and send transaction
          const signedTx = await wallet.signTransaction(transaction);
          const signature = await wallet.sendRawTransaction(signedTx.serialize());
          
          console.log('Transaction signed and sent:', signature);
          
          // Return success data
          return {
            signature: signature,
            type: tradeRequest.tradeType,
            trade: data.trade,
            message: data.message
          };
        } catch (walletError) {
          console.error('Wallet error:', walletError);
          throw new Error(`Transaction failed: ${walletError.message}`);
        }
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      const action = variables.tradeType === 'buy' ? 'bought' : 'sold';
      
      // Handle new data format from bonding curve functions
      let message = data.message || `Successfully ${action}!`;
      if (data.trade) {
        if (variables.tradeType === 'buy') {
          message = `Bought ${data.trade.tokensOut.toFixed(2)} tokens for ${data.trade.solIn} SOL`;
        }
      }
      
      toast.success(message);
      
      // Check for trading achievements  
      checkAchievements({
        userWallet: variables.walletAddress,
        tokenId: variables.tokenId,
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
