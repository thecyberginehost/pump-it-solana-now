import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const createToken = useMutation({
    mutationFn: async ({ tokenData, walletAddress, initialBuyIn = 0 }: { 
      tokenData: TokenData; 
      walletAddress: string;
      initialBuyIn?: number;
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
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Token "${data.token.name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      queryClient.invalidateQueries({ queryKey: ['recent-tokens'] });
      
      // Navigate to success page with token details
      const params = new URLSearchParams({
        name: data.token.name,
        symbol: data.token.symbol,
        address: data.token.contract_address || '',
        image: data.token.image_url || ''
      });
      navigate(`/token-success?${params.toString()}`);
    },
    onError: (error: any) => {
      console.error('Token creation error:', error);
      toast.error(error?.message || 'Failed to create token');
    },
  });

  const handleTokenCreation = async (tokenData: TokenData, walletAddress: string, initialBuyIn: number = 0) => {
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
      await createToken.mutateAsync({ tokenData, walletAddress, initialBuyIn });
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