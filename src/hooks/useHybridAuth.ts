import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';

export const useHybridAuth = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  const walletAddress = publicKey?.toString();

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Query to get user profile (works for both wallet and email users)
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id || walletAddress],
    queryFn: async () => {
      if (!user?.id && !walletAddress) return null;
      
      // For email auth users, use their user ID
      // For wallet users, use their wallet address
      const identifier = user?.id?.toString() || walletAddress;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', identifier)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!(user?.id || (connected && walletAddress)),
  });

  // Mutation to create or update wallet profile
  const createOrUpdateWalletProfile = useMutation({
    mutationFn: async (walletAddress: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          wallet_address: walletAddress,
          auth_type: 'wallet',
          last_active: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  // Email authentication functions
  const signUpWithEmail = async (email: string, password: string, rankType: 'Forgemaster' | 'Forgelord' = 'Forgemaster') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          is_admin: true,
          rank_type: rankType,
        }
      }
    });
    return { data, error };
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (connected) {
      disconnect();
    }
    queryClient.clear();
  };

  // Auto-create wallet profile when wallet connects (for non-email users)
  useEffect(() => {
    if (connected && walletAddress && !profile && !isLoading && !user) {
      createOrUpdateWalletProfile.mutate(walletAddress);
    }
  }, [connected, walletAddress, profile, isLoading, user]);

  // Update last active for both auth types
  useEffect(() => {
    if ((connected && walletAddress && profile?.auth_type === 'wallet') || 
        (user && profile?.auth_type === 'email')) {
      const updateLastActive = async () => {
        const identifier = user?.id?.toString() || walletAddress;
        await supabase
          .from('profiles')
          .update({ last_active: new Date().toISOString() })
          .eq('wallet_address', identifier);
      };
      
      updateLastActive();
    }
  }, [connected, walletAddress, profile, user]);

  const isConnected = connected || !!user;
  const userIdentifier = user?.id?.toString() || walletAddress;
  const isAuthenticated = (connected && !!walletAddress) || !!user;
  const isAdmin = profile?.is_admin || false;
  const authType = profile?.auth_type || (user ? 'email' : 'wallet');

  return {
    // Wallet-specific
    walletAddress,
    connectWallet: () => {}, // Handled by wallet adapter
    
    // Email-specific
    user,
    session,
    signUpWithEmail,
    signInWithEmail,
    
    // Shared
    isConnected,
    userIdentifier,
    profile,
    isLoading,
    signOut,
    isAuthenticated,
    isAdmin,
    authType,
  };
};