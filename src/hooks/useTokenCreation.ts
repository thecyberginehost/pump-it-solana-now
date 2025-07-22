
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAchievements } from './useAchievements';

export interface TokenData {
  name: string;
  symbol: string;
  image: string;
  description?: string;
  telegram_url?: string;
  x_url?: string;
}

export const useTokenCreation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const { checkAchievements } = useAchievements();
  const { signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const createToken = useMutation({
    mutationFn: async ({ tokenData, walletAddress, initialBuyIn = 0, freeze = false }: { 
      tokenData: TokenData; 
      walletAddress: string;
      initialBuyIn?: number;
      freeze?: boolean;
    }) => {
      // Step 1: Get transaction from backend
      const { data, error } = await supabase.functions.invoke('create-token', {
        body: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          imageUrl: tokenData.image,
          description: tokenData.description,
          telegramUrl: tokenData.telegram_url,
          xUrl: tokenData.x_url,
          walletAddress,
          initialBuyIn,
          freeze,
        },
      });

      if (error) throw error;

      // Step 2: If backend returns a transaction, sign and send it
      if (data.requiresSignature && data.transaction) {
        if (!signTransaction || !sendTransaction) {
          throw new Error('Wallet not connected for signing');
        }

        try {
          // Deserialize transaction
          const transactionBuffer = new Uint8Array(data.transaction);
          const transaction = Transaction.from(transactionBuffer);
          
          // Sign transaction with user's wallet
          const signedTransaction = await signTransaction(transaction);
          
          // Send transaction
          const signature = await sendTransaction(signedTransaction, connection);
          
          console.log('Transaction sent:', signature);
          
          // Return success data
          return {
            ...data,
            signature,
            transactionConfirmed: true
          };
        } catch (signError) {
          console.error('Transaction signing/sending failed:', signError);
          throw new Error(`Transaction failed: ${signError.message}`);
        }
      }

      return data;
    },
    onSuccess: (data, variables) => {
      const trustMessage = data.trustLevel === 'Community Safe' 
        ? ' 🛡️ No freeze authority = Community safe!' 
        : '';
      toast.success(`Token "${data.token.name}" created successfully!${trustMessage}`);
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      queryClient.invalidateQueries({ queryKey: ['recent-tokens'] });
      
      // Check for creator achievements
      checkAchievements({
        userWallet: variables.walletAddress,
        checkType: 'creator',
      });
      
      // Navigate to success page with token details
      const params = new URLSearchParams({
        name: data.token.name,
        symbol: data.token.symbol,
        address: data.token.contract_address || '',
        image: data.token.image_url || '',
        trustLevel: data.trustLevel || 'Community Safe'
      });
      navigate(`/token-success?${params.toString()}`);
    },
    onError: (error: any) => {
      console.error('Token creation error:', error);
      toast.error(error?.message || 'Failed to create token');
    },
  });

  const handleTokenCreation = async (
    tokenData: TokenData, 
    walletAddress: string, 
    initialBuyIn: number = 0,
    freeze: boolean = false // Default to false for community trust
  ) => {
    if (!tokenData.name || !tokenData.symbol) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (initialBuyIn < 0) {
      toast.error('Initial buy-in amount cannot be negative');
      return;
    }

    setIsCreating(true);
    try {
      await createToken.mutateAsync({ tokenData, walletAddress, initialBuyIn, freeze });
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createToken: handleTokenCreation,
    isCreating: isCreating || createToken.isPending,
    error: createToken.error,
  };
};
