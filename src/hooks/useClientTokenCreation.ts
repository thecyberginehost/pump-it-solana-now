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

export const useClientTokenCreation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const { checkAchievements } = useAchievements();
  const { sendTransaction, publicKey } = useWallet();
  const { connection } = useConnection();
  const { creatorLimits, consumeCredit } = useCreatorControls();

  const createToken = useMutation({
    mutationFn: async ({ tokenData, walletAddress }: { 
      tokenData: TokenData; 
      walletAddress: string;
    }) => {
      // Check creator limits before proceeding
      if (!creatorLimits.allowed) {
        throw new Error(`Creator limit: ${creatorLimits.reason}`);
      }

      console.log('🚀 Starting client-side token creation');
      console.log('📝 Token data:', { 
        name: tokenData.name, 
        symbol: tokenData.symbol, 
        hasImage: !!tokenData.image
      });

      try {
        // Step 1: Get transaction instructions
        console.log('🔧 Getting token creation instructions...');
        const { data: instructionsData, error: instructionsError } = await supabase.functions.invoke('create-token-instructions', {
          body: {
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description || `${tokenData.name} - A new token created with Moonforge`,
            image: tokenData.image,
            telegram_url: tokenData.telegram_url,
            x_url: tokenData.x_url,
            creatorWallet: walletAddress
          }
        });

        if (instructionsError || !instructionsData.success) {
          throw new Error(instructionsError?.message || 'Failed to generate token creation instructions');
        }

        const instructions = instructionsData.data;
        console.log('✅ Token instructions generated:', instructions.mintAddress);

        // Step 2: Execute transactions with user's wallet
        console.log('🔐 Sending transactions for user signature...');
        
        const signatures = [];
        for (let i = 0; i < instructions.transactions.length; i++) {
          const serializedTx = instructions.transactions[i];
          const transaction = Transaction.from(Uint8Array.from(atob(serializedTx), c => c.charCodeAt(0)));
          
          console.log(`📝 Sending transaction ${i + 1}/${instructions.transactions.length}...`);
          toast.info(`Please sign transaction ${i + 1} of ${instructions.transactions.length}`);
          
          const signature = await sendTransaction(transaction, connection);
          signatures.push(signature);
          
          console.log(`✅ Transaction ${i + 1} confirmed:`, signature);
          toast.success(`Transaction ${i + 1} confirmed!`);
        }

        // Step 3: Store token in database after successful transactions
        console.log('💾 Storing token in database...');
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
            mint_address: instructions.mintAddress,
            bonding_curve_address: `${instructions.mintAddress}_curve`,
            total_supply: 1000000000,
            market_cap: 1000,
            price: 0.000001,
            holder_count: 1,
            volume_24h: 0,
            sol_raised: 0,
            tokens_sold: 200000000,
            is_graduated: false,
            dev_mode: false, // Real devnet token
            platform_identifier: `devnet_${Date.now()}`
          })
          .select()
          .single();

        if (dbError) {
          console.error('❌ Database error:', dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }

        console.log('✅ Token stored in database successfully');

        // Step 4: Upload metadata (fire and forget)
        console.log('📤 Uploading metadata...');
        supabase.functions.invoke('upload-metadata', {
          body: {
            mintAddress: instructions.mintAddress,
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description || `${tokenData.name} - A new token created with Moonforge`,
            imageUrl: tokenData.image
          }
        }).catch(error => {
          console.warn('⚠️ Metadata upload failed (non-critical):', error);
        });

        return {
          success: true,
          token: tokenRecord,
          signature: signatures[signatures.length - 1], // Last transaction signature
          mintAddress: instructions.mintAddress,
          userTokenAccount: instructions.userTokenAccount,
          estimatedCost: instructions.estimatedCost,
          confirmed: true,
          realTransaction: true
        };
        
      } catch (error: any) {
        console.error('❌ Client-side creation error:', error);
        throw new Error(`Token creation failed: ${error.message}`);
      }
    },
    onSuccess: (data) => {
      console.log('🎉 Client token creation success:', data);
      
      // Consume creator credit after successful creation
      consumeCredit.mutate();

      toast.success("Token created successfully on Solana devnet! 🎉");
      
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
    },
    onError: (error) => {
      console.error('❌ Client token creation error:', error);
      toast.error(`Failed to create token: ${error.message}`);
      setIsCreating(false);
    },
  });

  const handleTokenCreation = async (tokenData: TokenData) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenData.name || !tokenData.symbol) {
      toast.error('Please provide token name and symbol');
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