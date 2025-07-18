import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { TrendingUp, ExternalLink, Copy, Crown } from "lucide-react";

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
  const [launches] = useState<LaunchData[]>([
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
    <section className="py-20 px-6 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-4 text-gradient">
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
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-8">
              <Crown className="text-accent animate-pulse" size={24} />
              <h3 className="text-2xl font-bold text-gradient">🔥 Trending Now</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trendingLaunches.map((launch) => (
                <Card key={launch.id} className="border-accent/50 bg-gradient-electric/20 hover:shadow-neon transition-all duration-300 hover:scale-105">
                  <CardContent className="p-6 relative">
                    <div className="absolute top-2 right-2">
                      <div className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full font-bold">
                        TRENDING
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-4xl">{launch.image}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{launch.name}</h3>
                        <p className="text-sm text-muted-foreground">${launch.symbol}</p>
                      </div>
                      <Button variant="ghost" size="icon">
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
          <h3 className="text-xl font-bold mb-6">Recent Launches</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {launches.map((launch) => (
              <Card key={launch.id} className="border-border/50 hover:shadow-neon transition-all duration-300 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl">{launch.image}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{launch.name}</h3>
                      <p className="text-sm text-muted-foreground">${launch.symbol}</p>
                    </div>
                    <Button variant="ghost" size="icon">
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

        <div className="text-center mt-12">
          <Button variant="outline">
            View All Launches
          </Button>
        </div>
      </div>
    </section>
  );
};

export default RecentLaunches;