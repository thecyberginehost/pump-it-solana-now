import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const useWalletAuth = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const queryClient = useQueryClient();
  const [isBanned, setIsBanned] = useState<boolean>(false);
  
  const walletAddress = publicKey?.toString();

  // Query to check if wallet is banned
  const { data: banStatus } = useQuery({
    queryKey: ['wallet-ban-status', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return false;
      
      const { data, error } = await supabase.rpc('is_wallet_banned', {
        p_wallet_address: walletAddress
      });
      
      if (error) {
        console.error('Error checking ban status:', error);
        return false;
      }
      
      return data;
    },
    enabled: !!walletAddress,
  });

  // Update ban status and disconnect if banned
  useEffect(() => {
    if (banStatus) {
      setIsBanned(true);
      if (connected) {
        disconnect();
        toast.error('Access Denied', {
          description: 'This wallet has been banned from the platform.',
        });
      }
    } else {
      setIsBanned(false);
    }
  }, [banStatus, connected, disconnect]);

  // Query to get user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      if (banStatus) return null; // Don't load profile for banned wallets
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!walletAddress && connected && !banStatus,
  });

  // Mutation to create or update profile
  const createOrUpdateProfile = useMutation({
    mutationFn: async (walletAddress: string) => {
      // Check if wallet is banned before creating profile
      const { data: isBanned } = await supabase.rpc('is_wallet_banned', {
        p_wallet_address: walletAddress
      });
      
      if (isBanned) {
        throw new Error('This wallet has been banned from the platform.');
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          wallet_address: walletAddress,
          last_active: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', walletAddress] });
    },
    onError: (error: any) => {
      if (error.message.includes('banned')) {
        disconnect();
        toast.error('Access Denied', {
          description: 'This wallet has been banned from the platform.',
        });
      }
    },
  });

  // Auto-create profile when wallet connects
  useEffect(() => {
    if (connected && walletAddress && !profile && !isLoading && !isBanned) {
      createOrUpdateProfile.mutate(walletAddress);
    }
  }, [connected, walletAddress, profile, isLoading, isBanned]);

  // Update last active when connected
  useEffect(() => {
    if (connected && walletAddress && profile) {
      const updateLastActive = async () => {
        await supabase
          .from('profiles')
          .update({ last_active: new Date().toISOString() })
          .eq('wallet_address', walletAddress);
      };
      
      updateLastActive();
    }
  }, [connected, walletAddress, profile]);

  const logout = () => {
    disconnect();
    queryClient.clear();
  };

  return {
    isConnected: connected,
    walletAddress,
    profile,
    isLoading,
    logout,
    isAuthenticated: connected && !!walletAddress && !isBanned,
    isBanned,
  };
};