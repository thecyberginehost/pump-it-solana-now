import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useUserRank, useRankInfo } from '@/hooks/useUserRanks';
import { Crown, Flame, Hammer, Star, Zap, Shield, Gem, Swords, Trophy } from 'lucide-react';

interface UserRankBadgeProps {
  walletAddress: string;
  className?: string;
  showThemeLine?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const getRankIcon = (rank: string, size: string = 'md') => {
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  
  switch (rank) {
    case 'acolyte':
      return <Hammer className={iconSize} />;
    case 'apprentice':
      return <Star className={iconSize} />;
    case 'journeyman':
      return <Zap className={iconSize} />;
    case 'adept':
      return <Shield className={iconSize} />;
    case 'artificer':
      return <Gem className={iconSize} />;
    case 'magister':
      return <Swords className={iconSize} />;
    case 'arch_forgemaster':
      return <Flame className={iconSize} />;
    case 'forgemaster':
      return <Crown className={iconSize} />;
    case 'forgelord':
      return <Trophy className={iconSize} />;
    default:
      return <Hammer className={iconSize} />;
  }
};

export const UserRankBadge: React.FC<UserRankBadgeProps> = ({
  walletAddress,
  className = '',
  showThemeLine = false,
  size = 'md'
}) => {
  const { data: userRank } = useUserRank(walletAddress);
  const { data: rankInfo } = useRankInfo(userRank?.current_rank);

  if (!userRank || !rankInfo || !userRank.show_title) {
    return null;
  }

  const badgeSize = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-1';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge 
        variant="outline" 
        className={`${badgeSize} border-2 font-medium`}
        style={{ 
          borderColor: rankInfo.rank_color,
          color: rankInfo.rank_color,
          backgroundColor: `${rankInfo.rank_color}10`
        }}
      >
        {getRankIcon(userRank.current_rank, size)}
        <span className="ml-1">{rankInfo.rank_name}</span>
      </Badge>
      {showThemeLine && (
        <span className="text-xs text-muted-foreground italic ml-2">
          "{rankInfo.theme_line}"
        </span>
      )}
    </div>
  );
};