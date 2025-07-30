import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAchievements } from './useAchievements';
import { useCreatorControls } from './useCreatorControls';

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
  const { signTransaction, sendTransaction, publicKey } = useWallet();
  const { connection } = useConnection();
  const { creatorLimits, consumeCredit } = useCreatorControls();

  const createToken = useMutation({
    mutationFn: async ({ tokenData, walletAddress, initialBuyIn = 0, freeze = false }: { 
      tokenData: TokenData; 
      walletAddress: string;
      initialBuyIn?: number;
      freeze?: boolean;
    }) => {
      // Check creator limits before proceeding
      if (!creatorLimits.allowed) {
        throw new Error(`Creator limit: ${creatorLimits.reason}`);
      }

      console.log('🚀 Starting token creation with creator controls validated');
      console.log('📝 Token data:', { 
        name: tokenData.name, 
        symbol: tokenData.symbol, 
        hasImage: !!tokenData.image,
        initialBuyIn 
      });

      try {
        // Step 1: Get transaction instructions from backend
        console.log('📡 Calling create-bonding-curve-token edge function...');
        const { data: txData, error: txError } = await supabase.functions.invoke('create-bonding-curve-token', {
          body: {
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description || `${tokenData.name} - A new token created with Moonforge`,
            imageUrl: tokenData.image,
            creatorWallet: walletAddress,
          },
        });

        console.log('📡 Edge function response:', { txData, txError });

        if (txError) {
          console.error('❌ Transaction preparation error:', txError);
          throw new Error(txError.message || 'Failed to prepare token creation');
        }

        if (!txData?.success) {
          console.error('❌ Transaction preparation failed:', txData);
          throw new Error(txData?.error || 'Transaction preparation failed');
        }

        console.log('✅ Token created in development mode:', txData);
        
        // For simulated tokens, skip blockchain transactions and go straight to database storage
        if (txData.devMode && (!txData.transactions || txData.transactions.length === 0)) {
          console.log('🧪 Development mode - skipping blockchain transactions');
          
          // Store token in database
          console.log('💾 Storing simulated token in database...');
          const { data: tokenRecord, error: dbError } = await supabase
            .from('tokens')
            .insert({
              name: tokenData.name,
              symbol: tokenData.symbol,
              description: tokenData.description || `${tokenData.name} - A new token created with Moonforge`,
              image_url: tokenData.image,
              telegram_url: tokenData.telegram_url,
              x_url: tokenData.x_url,
              creator_wallet: walletAddress,
              mint_address: txData.mintAddress,
              bonding_curve_address: txData.token?.bonding_curve_address || `${txData.mintAddress}_curve`,
              total_supply: 1000000000,
              market_cap: 1000,
              price: 0.000001,
              holder_count: 1,
              volume_24h: 0,
              sol_raised: 0,
              tokens_sold: 200000000,
              is_graduated: false,
              dev_mode: true,
              platform_identifier: `devnet_${txData.requestId}`
            })
            .select()
            .single();

          if (dbError) {
            console.error('❌ Database error:', dbError);
            throw new Error(`Database error: ${dbError.message}`);
          }

          console.log('✅ Simulated token stored in database successfully');

          return {
            success: true,
            token: tokenRecord,
            signature: `simulated_${Date.now()}`,
            mintAddress: txData.mintAddress,
            userTokenAccount: txData.userTokenAccount,
            estimatedCost: txData.estimatedCost,
            confirmed: true,
            devMode: true
          };
        }

        // If we get here, there were transactions but they failed or aren't supported yet
        throw new Error('Transaction processing not implemented for this mode');
        
      } catch (txError: any) {
        console.error('❌ Transaction error:', txError);
        throw new Error(`Transaction failed: ${txError.message}`);
      }
    },
    onSuccess: (data) => {
      console.log('🎉 Token creation success response:', data);
      
      // Consume creator credit after successful creation
      consumeCredit.mutate();

      if (data.confirmed || data.devMode) {
        let message = data.confirmed 
          ? "Token created successfully! 🎉" 
          : data.devMode
          ? "Token created in devnet mode! 🧪"
          : "Token created! Transaction may still be processing...";
          
        console.log('✅ Success message:', message);
        toast.success(message);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['tokens'] });
        queryClient.invalidateQueries({ queryKey: ['recent-tokens'] });
        queryClient.invalidateQueries({ queryKey: ['creator-tokens'] });
        
        // Check for creator achievements
        if (data.token?.id && data.token?.creator_wallet) {
          checkAchievements({
            userWallet: data.token.creator_wallet,
            tokenId: data.token.id,
            checkType: 'creator'
          });
        }
        
        // Navigate to token success page
        if (data.token?.id) {
          console.log('🧭 Navigating to token success page:', data.token.id);
          navigate(`/token-success/${data.token.id}`);
        } else {
          console.error('❌ No token ID found in response:', data);
        }
      } else {
        toast.info("Token creation initiated. Please check back in a moment.");
      }
    },
    onError: (error) => {
      console.error('❌ Token creation error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      toast.error(`Failed to create token: ${error.message}`);
      setIsCreating(false);
    },
  });

  const handleTokenCreation = async (tokenData: TokenData, initialBuyIn: number = 0, freeze: boolean = false) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenData.name || !tokenData.symbol) {
      toast.error('Please provide token name and symbol');
      return;
    }

    if (initialBuyIn < 0) {
      toast.error('Initial buy-in amount must be non-negative');
      return;
    }

    // Check creator limits
    if (!creatorLimits.allowed) {
      toast.error(`Cannot create token: ${creatorLimits.reason}`);
      return;
    }

    setIsCreating(true);
    
    try {
      await createToken.mutateAsync({
        tokenData,
        walletAddress: publicKey.toString(),
        initialBuyIn,
        freeze,
      });
    } catch (error) {
      console.error('Creation failed:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createToken: handleTokenCreation,
    isCreating: createToken.isPending || isCreating,
    error: createToken.error,
    creatorLimits,
  };
};