import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Users, Eye, Crown, Zap, Target, Share2 } from "lucide-react";
import { toast } from "sonner";

const PremiumDashboard = () => {
  const [activeTab, setActiveTab] = useState("analytics");

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
    }
  ];

  const handleUpgrade = (boostName: string, price: number) => {
    toast.success(`🚀 ${boostName} activated! (${price} SOL charged)`, {
      description: "Your token is now boosted with premium features"
    });
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
                      <Button 
                        className="w-full" 
                        onClick={() => handleUpgrade(boost.name, boost.price)}
                      >
                        Activate Boost
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