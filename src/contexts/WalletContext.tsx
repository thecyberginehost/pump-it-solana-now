import React, { useMemo, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { SolanaMobileWalletAdapter, createDefaultAuthorizationResultCache, createDefaultAddressSelector } from '@solana-mobile/wallet-adapter-mobile';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
  children: ReactNode;
}

export const WalletContextProvider = ({ children }: WalletContextProviderProps) => {
  // Use devnet for development
  const network = WalletAdapterNetwork.Devnet;
  
  // Configure the endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new SolanaMobileWalletAdapter({
        appIdentity: { name: 'Pump It Solana', uri: window.location.origin },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        addressSelector: createDefaultAddressSelector(),
        cluster: 'devnet',
        onWalletNotFound: async () => {
          window.open('https://phantom.app/download', '_blank');
        },
      }),
      new PhantomWalletAdapter({ 
        network,
        config: {
          deepLinkUrl: 'phantom://dapp',
          redirectUrl: window.location.origin
        }
      }),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};