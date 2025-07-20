import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const [isCreating, setIsCreating] = useState(false);

  const createToken = useMutation({
    mutationFn: async ({ tokenData, walletAddress }: { tokenData: TokenData; walletAddress: string }) => {
      const { data, error } = await supabase.functions.invoke('create-token', {
        body: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          imageUrl: tokenData.image,
          description: tokenData.description,
          telegramUrl: tokenData.telegram_url,
          xUrl: tokenData.x_url,
          walletAddress,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Token "${data.token.name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      queryClient.invalidateQueries({ queryKey: ['recent-tokens'] });
    },
    onError: (error: any) => {
      console.error('Token creation error:', error);
      toast.error(error?.message || 'Failed to create token');
    },
  });

  const handleTokenCreation = async (tokenData: TokenData, walletAddress: string) => {
    if (!tokenData.name || !tokenData.symbol) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsCreating(true);
    try {
      await createToken.mutateAsync({ tokenData, walletAddress });
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