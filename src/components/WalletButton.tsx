import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { LogOut, Wallet, Shield } from 'lucide-react';
import { useHybridAuth } from '@/hooks/useHybridAuth';
import { MobileWalletButton } from './MobileWalletButton';
import { AdminAuthModal } from './AdminAuthModal';
import { useState } from 'react';

export const WalletButton = () => {
  const { connected, publicKey } = useWallet();
  const { signOut, isAuthenticated, authType, profile } = useHybridAuth();
  const [showAdminModal, setShowAdminModal] = useState(false);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Use mobile wallet button for mobile devices
  if (isMobile) {
    return <MobileWalletButton />;
  }

  // If authenticated (wallet or email)
  if (isAuthenticated) {
    let displayText = '';
    let icon = <Wallet className="h-4 w-4" />;
    
    if (authType === 'email' && profile?.username) {
      // Show admin username
      displayText = profile.username;
      icon = <Shield className="h-4 w-4" />;
    } else if (publicKey) {
      // Show shortened wallet address
      displayText = `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`;
    }
    
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" className="flex items-center gap-2">
          {icon}
          {displayText}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={signOut}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !rounded-md !h-10 !px-4 !py-2 !text-sm !font-medium !transition-colors" />
      
      <AdminAuthModal 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)} 
      />
    </div>
  );
};