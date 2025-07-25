import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfileModal } from './UserProfileModal';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useHybridAuth } from '@/hooks/useHybridAuth';
import { User, Shield } from 'lucide-react';
import { UserRankBadge } from './UserRankBadge';

export const UserProfileButton: React.FC = () => {
  const { userIdentifier, profile, authType } = useHybridAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!userIdentifier) return null;

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center space-x-2"
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="text-xs">
            {profile?.username 
              ? profile.username.charAt(0).toUpperCase()
              : authType === 'email' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />
            }
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex items-center gap-2">
          {/* Only show rank badge for non-admin users */}
          {!profile?.is_admin && (
            <UserRankBadge walletAddress={userIdentifier} size="sm" />
          )}
          <span>
            {profile?.username || formatWalletAddress(userIdentifier)}
          </span>
        </div>
      </Button>
      
      <UserProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};