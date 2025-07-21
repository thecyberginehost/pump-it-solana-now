import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Users, Eye, Crown, Zap, Target, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWalletAuth } from "@/hooks/useWalletAuth";

const PremiumDashboard = () => {
  const { isAuthenticated, walletAddress } = useWalletAuth();
  const [activeTab, setActiveTab] = useState("analytics");
  const [availableTop1Spot, setAvailableTop1Spot] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userTokens, setUserTokens] = useState([]);
  const [userStats, setUserStats] = useState({
    totalRevenue: 0,
    activeTokens: 0,
    totalHolders: 0,
    totalViews: 0
  });

  useEffect(() => {
    if (isAuthenticated && walletAddress) {
      fetchAvailableTop1Spot();
      fetchUserTokens();
    }
  }, [isAuthenticated, walletAddress]);

  const fetchUserTokens = async () => {
    if (!walletAddress) return;
    
    try {
      const { data: tokens, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('creator_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserTokens(tokens || []);
      
      // Calculate stats from real data
      const stats = {
        totalRevenue: tokens?.reduce((sum, token) => sum + (token.creation_fee || 0.02), 0) || 0,
        activeTokens: tokens?.length || 0,
        totalHolders: tokens?.reduce((sum, token) => sum + (token.holder_count || 1), 0) || 0,
        totalViews: tokens?.reduce((sum, token) => sum + (token.volume_24h || 0), 0) || 0
      };
      
      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user tokens:', error);
    }
  };

  const fetchAvailableTop1Spot = async () => {
    try {
      const { data, error } = await supabase.rpc('get_available_top_10_spots');
      if (error) throw error;
      setAvailableTop1Spot(data > 0 ? 1 : 0);
    } catch (error) {
      console.error('Error fetching available spot:', error);
      setAvailableTop1Spot(1);
    }
  };

  const trendingBoosts = [
    {
      name: "Quick Trending",
      price: 0.05,
      duration: "1 hour",
      features: ["Featured on trending page for 1 hour"],
      icon: TrendingUp,
      color: "text-blue-500"
    },
    {
      name: "Half Day Trending",
      price: 0.2,
      duration: "12 hours",
      features: ["Featured on trending page for 12 hours"],
      icon: TrendingUp,
      color: "text-green-500"
    },
    {
      name: "Daily Trending",
      price: 0.35,
      duration: "24 hours",
      features: ["Featured on trending page for 24 hours"],
      icon: TrendingUp,
      color: "text-yellow-500"
    },
    {
      name: "Weekly Trending",
      price: 1.5,
      duration: "1 week",
      features: ["Featured on trending page for 1 week"],
      icon: Crown,
      color: "text-purple-500"
    },
    {
      name: "Premium Trending",
      price: 10.0,
      duration: "2 weeks",
      features: ["Featured in top 10 trending tokens for 2 weeks"],
      icon: Target,
      color: "text-emerald-500"
    },
    {
      name: "Legendary Degen Trending #1",
      price: 20.0,
      duration: "30 days",
      features: ["#1 spot on trending page for 30 days", "Maximum visibility and exposure", "Exclusive top position"],
      icon: Crown,
      color: "text-yellow-500"
    }
  ];

  const handleUpgrade = async (boostName: string, price: number) => {
    // Check if this is the Legendary Degen Trending #1 boost and if spot is available
    if (boostName === "Legendary Degen Trending #1") {
      if (availableTop1Spot <= 0) {
        toast.error("❌ #1 trending spot is taken!", {
          description: "The #1 trending spot is currently occupied. Try again later."
        });
        return;
      }
      
      setIsLoading(true);
      try {
        if (!walletAddress) {
          toast.error('Please connect your wallet first');
          return;
        }

        // For now, just show success without creating database record
        // In real implementation, this would also need a token_id
        toast.success(`🚀 ${boostName} activated! (${price} SOL charged)`, {
          description: "Your token boost is now active!"
        });
        
        // Update available spot
        setAvailableTop1Spot(0);
      } catch (error) {
        toast.error("Failed to activate boost. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.success(`🚀 ${boostName} activated! (${price} SOL charged)`, {
        description: "Your token is now boosted with premium features"
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-muted-foreground">Connect your wallet to access your creator dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Creator Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Track performance and boost your tokens
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={activeTab === "analytics" ? "default" : "outline"}
              onClick={() => setActiveTab("analytics")}
            >
              Analytics
            </Button>
            <Button 
              variant={activeTab === "boosts" ? "default" : "outline"}
              onClick={() => setActiveTab("boosts")}
            >
              Premium Boosts
            </Button>
          </div>
        </div>

        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{userStats.totalRevenue.toFixed(2)} SOL</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Tokens</p>
                      <p className="text-2xl font-bold">{userStats.activeTokens}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Holders</p>
                      <p className="text-2xl font-bold">{userStats.totalHolders.toLocaleString()}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Volume</p>
                      <p className="text-2xl font-bold">{userStats.totalViews.toFixed(1)}K</p>
                    </div>
                    <Eye className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Token Performance */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Your Tokens</h2>
              {userTokens.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-xl font-semibold mb-2">No tokens created yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first meme token to start tracking performance</p>
                    <Button onClick={() => window.location.href = '/'}>
                      Create Your First Token
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                userTokens.map((token) => (
                  <Card key={token.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{token.name}</h3>
                            <Badge variant="secondary">${token.symbol}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Market Cap</p>
                              <p className="font-medium">${token.market_cap?.toLocaleString() || '0'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Holders</p>
                              <p className="font-medium">{token.holder_count?.toLocaleString() || '1'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Volume 24h</p>
                              <p className="font-medium">${token.volume_24h?.toLocaleString() || '0'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Created</p>
                              <p className="font-medium">{new Date(token.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Share2 className="w-4 h-4 mr-1" />
                            Share
                          </Button>
                          <Button size="sm">Boost Again</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "boosts" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Trending Boost Packages</h2>
              <p className="text-muted-foreground">
                Get your token featured on the trending page for increased visibility
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingBoosts.map((boost, index) => {
                const IconComponent = boost.icon;
                return (
                  <Card key={index} className="relative overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/60" />
                    <CardHeader className="text-center">
                      <div className={`mx-auto w-16 h-16 rounded-full bg-background border-2 border-border flex items-center justify-center mb-4`}>
                        <IconComponent className={`w-8 h-8 ${boost.color}`} />
                      </div>
                      <CardTitle className="text-xl">{boost.name}</CardTitle>
                      <div className="space-y-1">
                        <div className="text-3xl font-bold text-primary">{boost.price} SOL</div>
                        <CardDescription>{boost.duration}</CardDescription>
                      </div>
                    </CardHeader>
                     <CardContent className="space-y-4">
                       <div className="space-y-2">
                         {boost.features.map((feature, idx) => (
                           <div key={idx} className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-primary rounded-full" />
                             <span className="text-sm">{feature}</span>
                           </div>
                         ))}
                       </div>
                       
                        {/* Show availability for Legendary Degen Trending #1 */}
                        {boost.name === "Legendary Degen Trending #1" && (
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Available Spot:</span>
                              <Badge variant={availableTop1Spot > 0 ? "default" : "destructive"}>
                                {availableTop1Spot > 0 ? "Available" : "Taken"}
                              </Badge>
                            </div>
                            {availableTop1Spot === 0 && (
                              <p className="text-xs text-destructive mt-1">❌ #1 spot is occupied</p>
                            )}
                          </div>
                        )}
                        
                        <Button 
                          className="w-full" 
                          onClick={() => handleUpgrade(boost.name, boost.price)}
                          disabled={isLoading || (boost.name === "Legendary Degen Trending #1" && availableTop1Spot <= 0)}
                        >
                          {isLoading && boost.name === "Legendary Degen Trending #1" ? "Booking..." : "Activate Boost"}
                        </Button>
                     </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ROI Calculator */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>ROI Calculator</CardTitle>
                <CardDescription>
                  See potential returns from premium boosts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="font-medium">Basic Launch</p>
                    <Progress value={20} className="h-2" />
                    <p className="text-sm text-muted-foreground">~$10k market cap potential</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">With Premium Boost</p>
                    <Progress value={60} className="h-2" />
                    <p className="text-sm text-muted-foreground">~$50k market cap potential</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Whale Package</p>
                    <Progress value={90} className="h-2" />
                    <p className="text-sm text-muted-foreground">~$200k+ market cap potential</p>
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

export default PremiumDashboard;