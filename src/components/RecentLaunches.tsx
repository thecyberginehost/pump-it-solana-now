import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { TrendingUp, ExternalLink, Copy } from "lucide-react";

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