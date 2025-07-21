import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Crown, TrendingUp, Target, Megaphone, Users, Clock, CheckCircle } from "lucide-react";

const Boosts = () => {
  const boostOptions = [
    {
      id: "basic",
      name: "Basic Boost",
      price: "0.1 SOL",
      icon: Zap,
      color: "blue",
      features: [
        "Featured in 'Recent Launches' for 24 hours",
        "Basic social media promotion",
        "Priority listing position"
      ],
      description: "Get your token noticed with basic promotion features"
    },
    {
      id: "premium", 
      name: "Premium Boost",
      price: "0.5 SOL",
      icon: Crown,
      color: "purple",
      popular: true,
      features: [
        "Featured for 72 hours",
        "Trending badge",
        "Social media blast",
        "Community showcase",
        "Analytics dashboard"
      ],
      description: "Maximum exposure with our premium promotion package"
    },
    {
      id: "viral",
      name: "Viral Launch",
      price: "1.0 SOL", 
      icon: TrendingUp,
      color: "green",
      features: [
        "Featured for 1 week",
        "Influencer promotion",
        "Multi-platform marketing",
        "Dedicated community support",
        "Advanced analytics",
        "Viral trend optimization"
      ],
      description: "All-out promotion for maximum viral potential"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-4 text-gradient">
            Token Boost Packages
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Supercharge your token launch with our promotional boost packages. 
            Get maximum exposure and increase your chances of going viral.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {boostOptions.map((boost) => {
            const IconComponent = boost.icon;
            return (
              <Card 
                key={boost.id} 
                className={`relative border-2 hover:scale-105 transition-all duration-300 ${
                  boost.popular 
                    ? 'border-primary shadow-lg shadow-primary/20' 
                    : 'border-border hover:border-accent/50'
                }`}
              >
                {boost.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full bg-${boost.color}-500/10 flex items-center justify-center mb-4`}>
                    <IconComponent className={`w-8 h-8 text-${boost.color}-500`} />
                  </div>
                  <CardTitle className="text-2xl">{boost.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary">{boost.price}</div>
                  <p className="text-muted-foreground text-sm">{boost.description}</p>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {boost.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full ${boost.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                    variant={boost.popular ? "default" : "outline"}
                  >
                    Select {boost.name}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 bg-muted/50 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4 text-center">How Boost Packages Work</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <Target className="w-8 h-8 mx-auto mb-3 text-accent" />
              <h3 className="font-semibold mb-2">Targeted Exposure</h3>
              <p className="text-sm text-muted-foreground">
                Your token gets featured in high-visibility areas of our platform
              </p>
            </div>
            <div className="text-center">
              <Megaphone className="w-8 h-8 mx-auto mb-3 text-accent" />
              <h3 className="font-semibold mb-2">Social Promotion</h3>
              <p className="text-sm text-muted-foreground">
                We promote your token across our social media channels
              </p>
            </div>
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto mb-3 text-accent" />
              <h3 className="font-semibold mb-2">Community Access</h3>
              <p className="text-sm text-muted-foreground">
                Get access to our trader communities and influencer networks
              </p>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-3 text-accent" />
              <h3 className="font-semibold mb-2">Extended Features</h3>
              <p className="text-sm text-muted-foreground">
                Longer featuring periods and priority placement in listings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Boosts;