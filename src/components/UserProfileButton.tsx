import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { UserProfileModal } from './UserProfileModal';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useHybridAuth } from '@/hooks/useHybridAuth';
import { User, Shield, Settings, LogOut, ChevronDown } from 'lucide-react';
import { UserRankBadge } from './UserRankBadge';
import { Link } from 'react-router-dom';

export const UserProfileButton: React.FC = () => {
  const { userIdentifier, profile, authType, signOut } = useHybridAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!userIdentifier) return null;

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2 h-auto p-2"
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
              <span className="text-sm">
                {profile?.username || formatWalletAddress(userIdentifier)}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-background border-border">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {profile?.username || formatWalletAddress(userIdentifier)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {profile?.is_admin ? (
                  <Badge variant="destructive" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    User
                  </Badge>
                )}
                {!profile?.is_admin && (
                  <UserRankBadge walletAddress={userIdentifier} size="sm" />
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/dashboard" className="flex items-center w-full">
              <User className="h-4 w-4 mr-2" />
              My Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsModalOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <UserProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};