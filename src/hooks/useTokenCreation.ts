
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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

  const createToken = useMutation({
    mutationFn: async ({ tokenData, walletAddress, initialBuyIn = 0, freeze = false }: { 
      tokenData: TokenData; 
      walletAddress: string;
      initialBuyIn?: number;
      freeze?: boolean;
    }) => {
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
          freeze, // Pass freeze parameter (defaults to false for community safety)
        },
      });

      if (error) throw error;
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
