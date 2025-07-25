import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserRank {
  id: string;
  user_wallet: string;
  current_rank: 'acolyte' | 'apprentice' | 'journeyman' | 'adept' | 'artificer' | 'magister' | 'arch_forgemaster' | 'forgemaster' | 'forgelord';
  rank_level: number;
  achieved_at: string;
  total_volume_traded: number;
  total_trades: number;
  tokens_created: number;
  tokens_graduated: number;
  show_title: boolean;
  created_at: string;
  updated_at: string;
}

export interface RankInfo {
  rank_name: string;
  rank_level: number;
  theme_line: string;
  rank_color: string;
}

// Hook to get user's current rank
export const useUserRank = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['user-rank', walletAddress],
    queryFn: async (): Promise<UserRank | null> => {
      if (!walletAddress) return null;

      const { data, error } = await supabase
        .from('user_ranks')
        .select('*')
        .eq('user_wallet', walletAddress)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    },
    enabled: !!walletAddress,
  });
};

// Hook to get rank information by rank enum
export const useRankInfo = (rank?: UserRank['current_rank']) => {
  return useQuery({
    queryKey: ['rank-info', rank],
    queryFn: async (): Promise<RankInfo | null> => {
      if (!rank) return null;

      const { data, error } = await supabase.rpc('get_rank_info', {
        p_rank: rank
      });

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!rank,
  });
};

// Hook to update rank calculation
export const useUpdateUserRank = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (walletAddress: string) => {
      const { data, error } = await supabase.rpc('calculate_user_rank', {
        p_user_wallet: walletAddress
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, walletAddress) => {
      queryClient.invalidateQueries({ queryKey: ['user-rank', walletAddress] });
      // Only show toast if rank actually changed
      // toast.success('Rank updated!');
    },
    onError: (error) => {
      console.error('Failed to update rank:', error);
      toast.error('Failed to update rank');
    },
  });
};

// Hook to toggle title display
export const useToggleTitleDisplay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ walletAddress, showTitle }: { walletAddress: string; showTitle: boolean }) => {
      const { error } = await supabase
        .from('user_ranks')
        .update({ show_title: showTitle })
        .eq('user_wallet', walletAddress);

      if (error) throw error;
    },
    onSuccess: (_, { walletAddress }) => {
      queryClient.invalidateQueries({ queryKey: ['user-rank', walletAddress] });
      toast.success('Title display updated!');
    },
    onError: (error) => {
      console.error('Failed to update title display:', error);
      toast.error('Failed to update title display');
    },
  });
};