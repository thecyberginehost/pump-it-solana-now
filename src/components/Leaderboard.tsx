import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, TrendingUp, Users, DollarSign, Crown, Flame, Zap } from "lucide-react";
import { toast } from "sonner";

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState("creators");

  const topCreators = [
    {
      rank: 1,
      name: "MemeKing",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop&crop=face",
      tokens: 15,
      totalVolume: 2500000,
      successRate: 87,
      badge: "🏆 Legendary",
      verified: true
    },
    {
      rank: 2,
      name: "CryptoQueen",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b25c8c3c?w=64&h=64&fit=crop&crop=face",
      tokens: 12,
      totalVolume: 1800000,
      successRate: 92,
      badge: "💎 Diamond",
      verified: true
    },
    {
      rank: 3,
      name: "TokenMaster",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face",
      tokens: 18,
      totalVolume: 1600000,
      successRate: 75,
      badge: "🔥 Fire",
      verified: false
    },
    {
      rank: 4,
      name: "PumpGuru",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face",
      tokens: 9,
      totalVolume: 1200000,
      successRate: 89,
      badge: "⭐ Elite",
      verified: true
    },
    {
      rank: 5,
      name: "MoonShooter",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face",
      tokens: 14,
      totalVolume: 950000,
      successRate: 71,
      badge: "🚀 Rising",
      verified: false
    }
  ];

  const hotTokens = [
    {
      rank: 1,
      name: "DogeAI",
      symbol: "DOGEAI",
      creator: "MemeKing",
      marketCap: 890000,
      change24h: 156.7,
      volume24h: 45000,
      holders: 2340,
      trending: true
    },
    {
      rank: 2,
      name: "PumpCoin",
      symbol: "PUMP",
      creator: "CryptoQueen",
      marketCap: 650000,
      change24h: 89.2,
      volume24h: 32000,
      holders: 1890,
      trending: true
    },
    {
      rank: 3,
      name: "MoonRocket",
      symbol: "MOON",
      creator: "TokenMaster",
      marketCap: 420000,
      change24h: 67.8,
      volume24h: 28000,
      holders: 1560,
      trending: false
    }
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const handleFollowCreator = (creator: string) => {
    toast.success(`🎯 Now following ${creator}!`, {
      description: "You'll get notified when they launch new tokens"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent mb-4">
            Hall of Fame
          </h1>
          <p className="text-muted-foreground text-lg">
            Top performers and hottest tokens on MoonForge
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-muted rounded-lg p-1">
            <Button 
              variant={activeTab === "creators" ? "default" : "ghost"}
              onClick={() => setActiveTab("creators")}
              className="rounded-md"
            >
              <Users className="w-4 h-4 mr-2" />
              Top Creators
            </Button>
            <Button 
              variant={activeTab === "tokens" ? "default" : "ghost"}
              onClick={() => setActiveTab("tokens")}
              className="rounded-md"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Hot Tokens
            </Button>
          </div>
        </div>

        {activeTab === "creators" && (
          <div className="space-y-6">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {topCreators.slice(0, 3).map((creator, index) => (
                <Card key={creator.rank} className={`relative overflow-hidden ${index === 0 ? 'md:order-2 transform md:scale-110' : index === 1 ? 'md:order-1' : 'md:order-3'}`}>
                  <div className={`absolute top-0 left-0 w-full h-2 ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' : 'bg-gradient-to-r from-amber-500 to-amber-700'}`} />
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                      {getRankIcon(creator.rank)}
                    </div>
                    <Avatar className="w-16 h-16 mx-auto mb-4">
                      <AvatarImage src={creator.avatar} />
                      <AvatarFallback>{creator.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="font-bold">{creator.name}</h3>
                        {creator.verified && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <Badge variant="secondary">{creator.badge}</Badge>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">{creator.tokens}</span> tokens created</p>
                        <p><span className="font-medium">${creator.totalVolume.toLocaleString()}</span> total volume</p>
                        <p><span className="font-medium">{creator.successRate}%</span> success rate</p>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={() => handleFollowCreator(creator.name)}
                      >
                        Follow Creator
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Full Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Creator Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCreators.map((creator) => (
                    <div key={creator.rank} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {getRankIcon(creator.rank)}
                        </div>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={creator.avatar} />
                          <AvatarFallback>{creator.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{creator.name}</span>
                            {creator.verified && <Crown className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <div className="text-sm text-muted-foreground">{creator.badge}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{creator.tokens}</div>
                          <div className="text-muted-foreground">Tokens</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">${(creator.totalVolume / 1000000).toFixed(1)}M</div>
                          <div className="text-muted-foreground">Volume</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{creator.successRate}%</div>
                          <div className="text-muted-foreground">Success</div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleFollowCreator(creator.name)}
                        >
                          Follow
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "tokens" && (
          <div className="space-y-6">
            {/* Hot Tokens Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {hotTokens.map((token) => (
                <Card key={token.rank} className="relative overflow-hidden hover:shadow-xl transition-all">
                  {token.trending && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-gradient-to-r from-red-500 to-orange-500 animate-pulse">
                        <Flame className="w-3 h-3 mr-1" />
                        HOT
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getRankIcon(token.rank)}
                        <div>
                          <h3 className="font-bold text-lg">{token.name}</h3>
                          <p className="text-sm text-muted-foreground">${token.symbol}</p>
                        </div>
                      </div>
                      <div className={`text-right ${token.change24h > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <div className="text-lg font-bold">+{token.change24h.toFixed(1)}%</div>
                        <div className="text-xs">24h</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Market Cap</span>
                        <span className="font-medium">${token.marketCap.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">24h Volume</span>
                        <span className="font-medium">${token.volume24h.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Holders</span>
                        <span className="font-medium">{token.holders.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Creator</span>
                        <Badge variant="outline">{token.creator}</Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button className="flex-1" size="sm">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Trade
                      </Button>
                      <Button variant="outline" size="sm">
                        <Zap className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Achievement Badges */}
            <Card>
              <CardHeader>
                <CardTitle>Achievement Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="font-medium">Legendary</div>
                    <div className="text-xs text-muted-foreground">$1M+ volume</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl mb-2">💎</div>
                    <div className="font-medium">Diamond</div>
                    <div className="text-xs text-muted-foreground">90%+ success</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl mb-2">🔥</div>
                    <div className="font-medium">Fire</div>
                    <div className="text-xs text-muted-foreground">10+ tokens</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl mb-2">⭐</div>
                    <div className="font-medium">Elite</div>
                    <div className="text-xs text-muted-foreground">Verified creator</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;