import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Upload, Eye, Wallet, Sparkles } from "lucide-react";
import AISuggestions from "./AISuggestions";
import AIMemeGenerator from "./AIMemeGenerator";

const TokenCreator = () => {
  const [tokenData, setTokenData] = useState({
    name: "",
    symbol: "",
    image: ""
  });

  const [showAIFeatures, setShowAIFeatures] = useState(false);

  const handleAINameSelect = (name: string) => {
    setTokenData(prev => ({ ...prev, name }));
  };

  const handleAISymbolSelect = (symbol: string) => {
    setTokenData(prev => ({ ...prev, symbol }));
  };

  const handleAIImageSelect = (imageUrl: string) => {
    setTokenData(prev => ({ ...prev, image: imageUrl }));
  };

  return (
    <section id="token-creator" className="py-20 px-6">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black mb-4 text-gradient">
            Launch Your Token
          </h2>
          <p className="text-muted-foreground">
            Create & launch in 30 seconds. No coding required.
          </p>
        </div>

        {/* AI Features Toggle - Simple */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Sparkles className="text-accent" size={16} />
          <span className="text-sm">Use AI Assistant</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={showAIFeatures}
              onChange={(e) => setShowAIFeatures(e.target.checked)}
              className="sr-only"
            />
            <div
              onClick={() => setShowAIFeatures(!showAIFeatures)}
              className={`w-8 h-4 rounded-full cursor-pointer transition-colors ${
                showAIFeatures ? 'bg-accent' : 'bg-muted'
              }`}
            >
              <div
                className={`w-3 h-3 bg-white rounded-full transition-transform ${
                  showAIFeatures ? 'translate-x-4' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </div>
          </div>
        </div>

        {/* AI Features */}
        {showAIFeatures && (
          <div className="space-y-4 mb-6">
            <AISuggestions
              onNameSelect={handleAINameSelect}
              onSymbolSelect={handleAISymbolSelect}
              currentName={tokenData.name}
              isPremium={true}
            />
            <AIMemeGenerator 
              onImageGenerated={handleAIImageSelect} 
              isPremium={true}
            />
          </div>
        )}

        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            {/* Token Name */}
            <div className="space-y-2">
              <Label htmlFor="tokenName" className="text-sm font-medium">
                Token Name
              </Label>
              <Input
                id="tokenName"
                placeholder="e.g. MoonDoge"
                value={tokenData.name}
                onChange={(e) => setTokenData(prev => ({ ...prev, name: e.target.value }))}
                className="text-lg h-12"
              />
            </div>

            {/* Token Symbol */}
            <div className="space-y-2">
              <Label htmlFor="tokenSymbol" className="text-sm font-medium">
                Symbol
              </Label>
              <Input
                id="tokenSymbol"
                placeholder="e.g. MOON"
                value={tokenData.symbol}
                onChange={(e) => setTokenData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                className="text-lg h-12"
                maxLength={6}
              />
            </div>

            {/* Token Image */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Image (optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste image URL or use AI generator"
                  value={tokenData.image}
                  onChange={(e) => setTokenData(prev => ({ ...prev, image: e.target.value }))}
                  className="flex-1"
                />
                <Button variant="outline" size="icon">
                  <Upload size={16} />
                </Button>
              </div>
              {tokenData.image && (
                <div className="flex items-center gap-2 mt-2">
                  <img 
                    src={tokenData.image} 
                    alt="Token preview" 
                    className="w-10 h-10 rounded object-cover border"
                  />
                  <span className="text-sm text-muted-foreground">Preview</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Launch Button */}
        <div className="mt-6">
          <Button 
            variant="neon" 
            size="xl" 
            className="w-full h-14 text-lg font-bold"
            disabled={!tokenData.name || !tokenData.symbol}
          >
            <Wallet className="mr-2" size={20} />
            Launch for 0.02 SOL (~$3)
          </Button>
          
          <p className="text-xs text-muted-foreground text-center mt-2">
            Fair launch • No presale • Instant liquidity
          </p>
        </div>
      </div>
    </section>
  );
};

export default TokenCreator;
