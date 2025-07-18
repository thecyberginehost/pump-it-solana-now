import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Upload, Eye, Wallet, Sparkles, Crown, Zap, TrendingUp } from "lucide-react";
import AISuggestions from "./AISuggestions";
import AIMemeGenerator from "./AIMemeGenerator";

const TokenCreator = () => {
  const [tokenData, setTokenData] = useState({
    name: "",
    symbol: "",
    supply: [69000000],
    image: "",
    stealthLaunch: false
  });

  const [launchTier, setLaunchTier] = useState("basic");
  const [boostOptions, setBoostOptions] = useState({
    featured: false,
    fastTrack: false,
    viralBoost: false
  });

  const [showAIFeatures, setShowAIFeatures] = useState(false);

  const supplyOptions = [
    { value: 69000000, label: "69M" },
    { value: 420000000, label: "420M" },
    { value: 1000000000, label: "1B" }
  ];

  const launchTiers = [
    {
      id: "basic",
      name: "Basic Launch",
      price: 0.025,
      features: ["Token Creation", "Basic AI Suggestions", "Standard Listing"],
      color: "border-border"
    },
    {
      id: "premium",
      name: "Premium Launch",
      price: 0.1,
      features: ["Everything in Basic", "10 AI Generations Included", "Priority Support", "48h Featured"],
      color: "border-accent"
    },
    {
      id: "viral",
      name: "Viral Launch",
      price: 0.25,
      features: ["Everything in Premium", "Unlimited AI Features", "7-day Featured", "Marketing Boost", "Analytics Dashboard"],
      color: "border-primary"
    }
  ];

  const boostPricing = {
    featured: { price: 0.015, label: "Featured Placement (24h)" },
    fastTrack: { price: 0.01, label: "Fast-Track Launch" },
    viralBoost: { price: 0.05, label: "Viral Marketing Boost" }
  };

  const calculateTotalPrice = () => {
    const tierPrice = launchTiers.find(tier => tier.id === launchTier)?.price || 0.025;
    const boostPrice = Object.entries(boostOptions).reduce((total, [key, enabled]) => {
      if (enabled) {
        return total + boostPricing[key as keyof typeof boostPricing].price;
      }
      return total;
    }, 0);
    return (tierPrice + boostPrice).toFixed(2);
  };

  const handleAINameSelect = (name: string) => {
    setTokenData(prev => ({ ...prev, name }));
  };

  const handleAISymbolSelect = (symbol: string) => {
    setTokenData(prev => ({ ...prev, symbol }));
  };

  const handleAIImageSelect = (imageUrl: string) => {
    setTokenData(prev => ({ ...prev, image: imageUrl }));
  };

  const handleBoostToggle = (boostType: keyof typeof boostOptions) => {
    setBoostOptions(prev => ({
      ...prev,
      [boostType]: !prev[boostType]
    }));
  };

  return (
    <section id="token-creator" className="py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-4 text-gradient">
            Forge Your Token
          </h2>
          <p className="text-muted-foreground">
            AI-powered token creation on Solana. Watch it moon! 🚀
          </p>
        </div>

        {/* Launch Tier Selection */}
        <Card className="border-accent/30 bg-gradient-electric/10 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="text-accent" size={20} />
              Choose Your Launch Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {launchTiers.map((tier) => (
              <div
                key={tier.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  launchTier === tier.id 
                    ? `${tier.color} bg-card/50` 
                    : "border-border/30 hover:border-border/60"
                }`}
                onClick={() => setLaunchTier(tier.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">{tier.name}</h3>
                  <div className="text-xl font-bold text-accent">
                    {tier.price} SOL
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tier.features.map((feature) => (
                    <span
                      key={feature}
                      className="text-xs bg-muted px-2 py-1 rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Boost Options */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="text-accent" size={20} />
              Launch Boosts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(boostPricing).map(([key, boost]) => (
              <div key={key} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={boostOptions[key as keyof typeof boostOptions]}
                    onCheckedChange={() => handleBoostToggle(key as keyof typeof boostOptions)}
                  />
                  <div>
                    <p className="font-medium">{boost.label}</p>
                    <p className="text-xs text-muted-foreground">
                      +{boost.price} SOL
                    </p>
                  </div>
                </div>
                <TrendingUp className="text-accent" size={16} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Features Toggle */}
        <Card className="border-accent/30 bg-gradient-electric/10 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="text-accent animate-pulse" size={20} />
                <div>
                  <p className="font-medium">AI Forge Assistant</p>
                  <p className="text-xs text-muted-foreground">
                    {launchTier === "viral" ? "Unlimited AI features included!" : "Pay-per-use: 0.005-0.01 SOL per generation"}
                  </p>
                </div>
              </div>
              <Switch
                checked={showAIFeatures}
                onCheckedChange={setShowAIFeatures}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Features */}
        {showAIFeatures && (
          <div className="space-y-4 mb-8">
            <AISuggestions
              onNameSelect={handleAINameSelect}
              onSymbolSelect={handleAISymbolSelect}
              currentName={tokenData.name}
              isPremium={launchTier === "viral"}
            />
            <AIMemeGenerator 
              onImageGenerated={handleAIImageSelect} 
              isPremium={launchTier === "viral"}
            />
          </div>
        )}

        <Card className="border-border/50 shadow-pump">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Token Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Token Name */}
            <div className="space-y-2">
              <Label htmlFor="tokenName" className="text-sm font-medium">
                Token Name
              </Label>
              <Input
                id="tokenName"
                placeholder="MoonDoge2024"
                value={tokenData.name}
                onChange={(e) => setTokenData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-input border-border"
              />
            </div>

            {/* Token Symbol */}
            <div className="space-y-2">
              <Label htmlFor="tokenSymbol" className="text-sm font-medium">
                Token Symbol
              </Label>
              <Input
                id="tokenSymbol"
                placeholder="MOON"
                value={tokenData.symbol}
                onChange={(e) => setTokenData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                className="bg-input border-border"
                maxLength={10}
              />
            </div>

            {/* Total Supply */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Total Supply: {tokenData.supply[0].toLocaleString()}
              </Label>
              <div className="flex gap-2 mb-4">
                {supplyOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={tokenData.supply[0] === option.value ? "electric" : "outline"}
                    size="sm"
                    onClick={() => setTokenData(prev => ({ ...prev, supply: [option.value] }))}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <Slider
                value={tokenData.supply}
                onValueChange={(value) => setTokenData(prev => ({ ...prev, supply: value }))}
                max={1000000000}
                min={1000000}
                step={1000000}
                className="w-full"
              />
            </div>

            {/* Token Image */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Token Image</Label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="https://example.com/image.png or use AI generator above"
                    value={tokenData.image}
                    onChange={(e) => setTokenData(prev => ({ ...prev, image: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Upload size={16} />
                </Button>
                {tokenData.image && (
                  <Button variant="outline" size="icon">
                    <Eye size={16} />
                  </Button>
                )}
              </div>
              {tokenData.image && (
                <div className="mt-2">
                  <img 
                    src={tokenData.image} 
                    alt="Token preview" 
                    className="w-16 h-16 rounded-lg object-cover border border-border"
                  />
                </div>
              )}
            </div>

            {/* Stealth Launch Toggle */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <Label className="text-sm font-medium">Stealth Launch</Label>
                <p className="text-xs text-muted-foreground">
                  Hide from recent launches for 30 minutes
                </p>
              </div>
              <Switch
                checked={tokenData.stealthLaunch}
                onCheckedChange={(checked) => setTokenData(prev => ({ ...prev, stealthLaunch: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Price Bar */}
        <div className="sticky bottom-0 bg-card border border-border rounded-lg p-4 mt-8 shadow-neon">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl font-bold">
              🔥 Launch for <span className="text-accent">{calculateTotalPrice()} SOL</span>
            </div>
            <div className="text-sm text-muted-foreground">
              ~${(parseFloat(calculateTotalPrice()) * 150).toFixed(0)} USD
            </div>
          </div>
          
          {Object.values(boostOptions).some(Boolean) && (
            <div className="text-xs text-muted-foreground mb-3">
              {Object.entries(boostOptions)
                .filter(([_, enabled]) => enabled)
                .map(([key, _]) => `✨ ${boostPricing[key as keyof typeof boostPricing].label}`)
                .join(" • ")}
            </div>
          )}
          
          <Button 
            variant="neon" 
            size="xl" 
            className="w-full animate-glow"
            disabled={!tokenData.name || !tokenData.symbol}
          >
            <Wallet className="mr-2" />
            FORGE IT NOW
          </Button>
          
          <p className="text-xs text-muted-foreground text-center mt-2">
            Connect your wallet to forge your moonshot
          </p>
        </div>
      </div>
    </section>
  );
};

export default TokenCreator;
