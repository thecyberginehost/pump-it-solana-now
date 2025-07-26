import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHybridAuth } from './useHybridAuth';

export interface UserProfile {
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  total_volume_traded: number;
  total_tokens_created: number;
  created_at: string;
  last_active: string;
}

export const useUserProfile = (walletAddress?: string) => {
  return useQuery({
    queryKey: ['user-profile', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as UserProfile | null;
    },
    enabled: !!walletAddress,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { userIdentifier, profile } = useHybridAuth();

  return useMutation({
    mutationFn: async (updates: {
      username?: string;
      avatar_url?: string;
    }) => {
      if (!userIdentifier) {
        throw new Error('User not authenticated');
      }

      // Check if username is already taken
      if (updates.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('username', updates.username)
          .neq('wallet_address', userIdentifier)
          .single();

        if (existingUser) {
          throw new Error('Username is already taken');
        }
      }

      // Use UPDATE instead of UPSERT to ensure RLS policies work correctly
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          last_active: new Date().toISOString(),
        })
        .eq('wallet_address', userIdentifier)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
};

export const useCreateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: {
      wallet_address: string;
      username?: string;
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          ...profile,
          last_active: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
};