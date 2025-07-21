import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { TrendingUp, ExternalLink, Copy, Crown, Loader2 } from "lucide-react";
import { useRecentTokens } from "@/hooks/useTokens";
import { toast } from "sonner";

interface LaunchData {
  id: string;
  name: string;
  symbol: string;
  creator: string;
  marketCap: string;
  change24h: number;
  image: string;
}

const RecentLaunches = () => {
  const { data: tokens, isLoading, error } = useRecentTokens();
  
  // Fallback data for when there are no real tokens yet
  const [fallbackLaunches] = useState<LaunchData[]>([
    {
      id: "1",
      name: "DOGE KILLER",
      symbol: "DOGEK",
      creator: "0x1234...5678",
      marketCap: "$420K",
      change24h: 1337.5,
      image: "🚀"
    },
    {
      id: "2", 
      name: "MOON BOY",
      symbol: "MOON",
      creator: "0xabcd...efgh",
      marketCap: "$69K",
      change24h: 420.0,
      image: "🌙"
    },
    {
      id: "3",
      name: "PUMP MACHINE",
      symbol: "PUMP",
      creator: "0x9999...1111",
      marketCap: "$1.2M",
      change24h: 2500.0,
      image: "💎"
    }
  ]);

  // Convert real tokens to LaunchData format
  const launches = tokens?.map(token => ({
    id: token.id,
    name: token.name,
    symbol: token.symbol,
    creator: `${token.creator_wallet.slice(0, 6)}...${token.creator_wallet.slice(-4)}`,
    marketCap: token.market_cap > 0 ? `$${(token.market_cap / 1000).toFixed(0)}K` : '$0',
    change24h: Math.random() * 500 + 50, // Mock change for now
    image: token.image_url ? '🎨' : '🚀'
  })) || fallbackLaunches;

  // Featured/Trending tokens that appear at the top
  const [trendingLaunches] = useState<LaunchData[]>([
    {
      id: "trending-1",
      name: "VIRAL COIN",
      symbol: "VIRAL",
      creator: "0xaaaa...bbbb",
      marketCap: "$2.5M",
      change24h: 5000.0,
      image: "🔥"
    },
    {
      id: "trending-2",
      name: "TREND SETTER",
      symbol: "TREND", 
      creator: "0xcccc...dddd",
      marketCap: "$1.8M",
      change24h: 3200.0,
      image: "⭐"
    }
  ]);

  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 5);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-gradient">
            Recent Pumps
          </h2>
          <p className="text-muted-foreground mb-4">
            Fresh launches from the community
          </p>
          <div className="text-sm text-accent">
            Refreshing in {timeLeft}s...
          </div>
        </div>

        {/* Trending/Featured Section */}
        {trendingLaunches.length > 0 && (
          <div className="mb-12 sm:mb-16">
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              <Crown className="text-accent animate-pulse" size={20} />
              <h3 className="text-xl sm:text-2xl font-bold text-gradient">🔥 Trending Now</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {trendingLaunches.map((launch) => (
                <Card key={launch.id} className="border-accent/50 bg-gradient-electric/20 hover:shadow-neon transition-all duration-300 hover:scale-105">
                  <CardContent className="p-4 sm:p-6 relative">
                    <div className="absolute top-2 right-2">
                      <div className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full font-bold">
                        TRENDING
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                      <div className="text-3xl sm:text-4xl">{launch.image}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg truncate">{launch.name}</h3>
                        <p className="text-sm text-muted-foreground">${launch.symbol}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <ExternalLink size={16} />
                      </Button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Market Cap</span>
                        <span className="font-medium">{launch.marketCap}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">24h Change</span>
                        <span className="font-medium text-accent flex items-center gap-1">
                          <TrendingUp size={14} />
                          +{launch.change24h}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Creator</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{launch.creator}</span>
                          <Button variant="ghost" size="icon" className="h-4 w-4">
                            <Copy size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button variant="electric" size="sm" className="w-full">
                      Trade Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Regular Recent Launches */}
        <div className="mb-8">
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Recent Launches</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin mr-2" size={24} />
              <span className="text-sm sm:text-base">Loading recent launches...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Failed to load recent launches</p>
              <p className="text-sm mt-2">Showing demo data instead</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {launches.map((launch) => (
                <Card key={launch.id} className="border-border/50 hover:shadow-neon transition-all duration-300 hover:scale-105">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                      <div className="text-3xl sm:text-4xl">{launch.image}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg truncate">{launch.name}</h3>
                        <p className="text-sm text-muted-foreground">${launch.symbol}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <ExternalLink size={16} />
                      </Button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Market Cap</span>
                        <span className="font-medium">{launch.marketCap}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">24h Change</span>
                        <span className="font-medium text-accent flex items-center gap-1">
                          <TrendingUp size={14} />
                          +{launch.change24h}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Creator</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{launch.creator}</span>
                          <Button variant="ghost" size="icon" className="h-4 w-4">
                            <Copy size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="electric" size="sm" className="flex-1">
                        Trade Now
                      </Button>
                      <Button size="sm" variant="outline" className="sm:w-auto">
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="text-center mt-8 sm:mt-12">
          <Button variant="outline" className="w-full sm:w-auto">
            View All Launches
          </Button>
        </div>
      </div>
    </section>
  );
};

export default RecentLaunches;