import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';

export const MobileWalletButton = () => {
  const { connected, publicKey, connecting } = useWallet();
  const { logout } = useWalletAuth();

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const handleMobileConnect = () => {
    if (isMobile) {
      // Deep link to Phantom app
      const currentUrl = encodeURIComponent(window.location.href);
      const phantomUrl = `phantom://browse/${currentUrl}`;
      
      // Try to open Phantom app
      window.location.href = phantomUrl;
      
      // Fallback: if app doesn't open, show instructions
      setTimeout(() => {
        alert('Please open your Phantom wallet app and navigate to the browser tab to connect');
      }, 1000);
    }
  };

  if (connected && publicKey) {
    const shortAddress = `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`;
    
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          {shortAddress}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={logout}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <Button 
        onClick={handleMobileConnect}
        disabled={connecting}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Wallet className="h-4 w-4 mr-2" />
        {connecting ? 'Connecting...' : 'Connect Phantom'}
      </Button>
    );
  }

  // For desktop, show instructions
  return (
    <Button variant="outline" disabled>
      Install Phantom Extension
    </Button>
  );
};