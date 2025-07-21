import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Users, Eye, Crown, Zap, Target, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PremiumDashboard = () => {
  const [activeTab, setActiveTab] = useState("analytics");
  const [availableTop1Spot, setAvailableTop1Spot] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAvailableTop1Spot();
  }, []);

  const fetchAvailableTop1Spot = async () => {
    try {
      // For now, just set to 1 - in real implementation this would check if #1 spot is taken
      setAvailableTop1Spot(1);
    } catch (error) {
      console.error('Error fetching available spot:', error);
      setAvailableTop1Spot(1); // Default to 1 if error
    }
  };

  const mockTokens = [
    {
      id: 1,
      name: "DogeCoin2024",
      symbol: "DOGE24",
      marketCap: 150000,
      holders: 1250,
      views: 8500,
      revenue: 3.2,
      trending: true,
      boost: "trending"
    },
    {
      id: 2,
      name: "MoonPump",
      symbol: "MOON",
      marketCap: 85000,
      holders: 890,
      views: 4200,
      revenue: 1.8,
      trending: false,
      boost: "visibility"
    }
  ];

  const trendingBoosts = [
    {
      name: "Premium Trending #1",
      price: 20.0,
      duration: "30 days",
      features: ["#1 spot on trending page for 30 days", "Maximum visibility and exposure", "Exclusive top position"],
      icon: Crown,
      color: "text-yellow-500"
    }
  ];

  const handleUpgrade = async (boostName: string, price: number) => {
    // Check if this is the Premium Trending #1 boost and if spot is available
    if (boostName === "Premium Trending #1") {
      if (availableTop1Spot <= 0) {
        toast.error("❌ #1 trending spot is taken!", {
          description: "The #1 trending spot is currently occupied. Try again later."
        });
        return;
      }
      
      setIsLoading(true);
      try {
        // Mock booking logic - in real implementation, this would:
        // 1. Process payment
        // 2. Insert into trending_boosts table
        // 3. Set token as #1 trending
        
        // For now, just simulate the booking
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update available spot
        setAvailableTop1Spot(0);
        
        toast.success(`🚀 ${boostName} activated! (${price} SOL charged)`, {
          description: "Your token is now #1 on trending for 30 days!"
        });
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
                      <p className="text-2xl font-bold">5.0 SOL</p>
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
                      <p className="text-2xl font-bold">2</p>
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
                      <p className="text-2xl font-bold">2,140</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold">12.7k</p>
                    </div>
                    <Eye className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Token Performance */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Your Tokens</h2>
              {mockTokens.map((token) => (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{token.name}</h3>
                          <Badge variant="secondary">${token.symbol}</Badge>
                          {token.trending && (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
                              <Crown className="w-3 h-3 mr-1" />
                              TRENDING
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Market Cap</p>
                            <p className="font-medium">${token.marketCap.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Holders</p>
                            <p className="font-medium">{token.holders.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Views</p>
                            <p className="font-medium">{token.views.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Revenue</p>
                            <p className="font-medium text-primary">{token.revenue} SOL</p>
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
              ))}
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
                       
                        {/* Show availability for Premium Trending #1 */}
                        {boost.name === "Premium Trending #1" && (
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
                          disabled={isLoading || (boost.name === "Premium Trending #1" && availableTop1Spot <= 0)}
                        >
                          {isLoading && boost.name === "Premium Trending #1" ? "Booking..." : "Activate Boost"}
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