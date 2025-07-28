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

      // Step 1: Get transaction instructions from backend
      console.log('📡 Calling create-token edge function...');
      const { data: txData, error: txError } = await supabase.functions.invoke('create-token', {
        body: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          decimals: 6,
          initialSupply: 1000000000,
          userWallet: walletAddress,
        },
      });

      console.log('📡 Edge function response:', { txData, txError });

      if (txError) {
        console.error('❌ Transaction preparation error:', txError);
        throw new Error(txError.message || 'Failed to prepare token creation');
      }

      if (!txData?.success || !txData?.transaction) {
        console.error('❌ Transaction preparation failed:', txData);
        throw new Error(txData?.error || 'Transaction preparation failed');
      }

      // Step 2: Sign and send transaction with user's wallet
      if (!signTransaction || !sendTransaction) {
        throw new Error('Wallet not connected for signing');
      }

      try {
        console.log('💰 Estimated cost:', txData.estimatedCost, 'SOL');
        console.log('📝 Deserializing transaction...');
        
        // Deserialize the prepared transaction
        const transactionBuffer = new Uint8Array(txData.transaction);
        const transaction = Transaction.from(transactionBuffer);
        
        console.log('✍️ Signing transaction...');
        // Sign transaction with user's wallet (user pays fees)
        const signedTransaction = await signTransaction(transaction);
        
        console.log('📤 Sending transaction...');
        // Send transaction to blockchain
        const signature = await sendTransaction(signedTransaction, connection);
        
        console.log('✅ Transaction sent successfully:', signature);
        
        // Wait for confirmation
        console.log('⏳ Waiting for transaction confirmation...');
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
          console.error('❌ Transaction failed on blockchain:', confirmation.value.err);
          throw new Error(`Blockchain transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log('🎉 Transaction confirmed successfully');

        // Step 3: Store token in database after successful blockchain transaction
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
            mint_address: txData.mintAddress,
            bonding_curve_address: `${txData.mintAddress}_curve`,
            total_supply: 1000000000,
            market_cap: 0,
            price: 0,
            holder_count: 1,
            volume_24h: 0,
            sol_raised: 0,
            tokens_sold: 0,
            is_graduated: false,
            dev_mode: true,
            platform_signature: signature,
            signature_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          })
          .select()
          .single();

        if (dbError) {
          console.error('❌ Database error:', dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }

        console.log('✅ Token stored in database successfully');

        return {
          success: true,
          token: tokenRecord,
          signature,
          mintAddress: txData.mintAddress,
          userTokenAccount: txData.userTokenAccount,
          estimatedCost: txData.estimatedCost,
          confirmed: true,
          devMode: true
        };
        
      } catch (txError) {
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