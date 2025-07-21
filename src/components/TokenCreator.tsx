import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Upload, Eye, Wallet, Sparkles, Loader2, Bot } from "lucide-react";
import AISuggestions from "./AISuggestions";
import AIMemeGenerator from "./AIMemeGenerator";
import { DegenCoPilot } from "./DegenCoPilot";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useTokenCreation } from "@/hooks/useTokenCreation";
import { toast } from "sonner";

const TokenCreator = () => {
  const [tokenData, setTokenData] = useState({
    name: "",
    symbol: "",
    image: "",
    description: "",
    telegram_url: "",
    x_url: ""
  });

  const [showAIFeatures, setShowAIFeatures] = useState(false);
  const [showCoPilot, setShowCoPilot] = useState(false);
  const [memePrompt, setMemePrompt] = useState('');
  const { isAuthenticated, walletAddress } = useWalletAuth();
  const { createToken, isCreating } = useTokenCreation();

  const handleAINameSelect = (name: string) => {
    setTokenData(prev => ({ ...prev, name }));
  };

  const handleAISymbolSelect = (symbol: string) => {
    setTokenData(prev => ({ ...prev, symbol }));
  };

  const handleAITokenSelect = (name: string, symbol: string) => {
    setTokenData(prev => ({ ...prev, name, symbol }));
    // Generate a contextual meme prompt based on the token name
    const contextualPrompt = generateMemePrompt(name);
    setMemePrompt(contextualPrompt);
  };

  const generateMemePrompt = (tokenName: string): string => {
    const name = tokenName.toLowerCase();
    
    if (name.includes('doge') || name.includes('dog')) {
      return `${tokenName} doge with laser eyes and diamond hands`;
    } else if (name.includes('pepe') || name.includes('frog')) {
      return `${tokenName} pepe the frog wearing a crown`;
    } else if (name.includes('moon') || name.includes('lunar')) {
      return `${tokenName} rocket ship flying to the moon with crypto symbols`;
    } else if (name.includes('rocket') || name.includes('blast')) {
      return `${tokenName} rocket launching with fire trails and stars`;
    } else if (name.includes('cat') || name.includes('kitty')) {
      return `${tokenName} cool cat with sunglasses holding crypto coins`;
    } else {
      return `${tokenName} meme character with diamond hands and rocket background`;
    }
  };

  const handleAIImageSelect = (imageUrl: string) => {
    setTokenData(prev => ({ ...prev, image: imageUrl }));
  };

  const handleLaunchToken = async () => {
    if (!isAuthenticated || !walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenData.name || !tokenData.symbol) {
      toast.error('Please fill in token name and symbol');
      return;
    }

    await createToken(tokenData, walletAddress);
  };

  return (
    <section id="token-creator" className="py-12 sm:py-20 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-gradient">
            Launch Your Token
          </h2>
          <p className="text-muted-foreground">
            Create & launch in 30 seconds. No coding required.
          </p>
        </div>

        {/* AI Features */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="text-accent" size={16} />
            <span className="text-sm">Use AI Tools</span>
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
          
          {isAuthenticated && (
            <Dialog open={showCoPilot} onOpenChange={setShowCoPilot}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Bot className="h-4 w-4" />
                  Degen CoPilot
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl w-[95vw] h-[90vh] sm:h-[80vh] p-0">
                <DialogHeader className="p-4 sm:p-6 pb-0">
                  <DialogTitle>Degen CoPilot - AI Marketing Assistant</DialogTitle>
                </DialogHeader>
                <div className="flex-1 p-4 sm:p-6 pt-0">
                  <DegenCoPilot 
                    tokenName={tokenData.name} 
                    tokenSymbol={tokenData.symbol}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* AI Features */}
        {showAIFeatures && (
          <div className="space-y-4 mb-6">
            <AISuggestions
              onNameSelect={handleAINameSelect}
              onSymbolSelect={handleAISymbolSelect}
              onTokenSelect={handleAITokenSelect}
              currentName={tokenData.name}
              isPremium={true}
            />
            <AIMemeGenerator 
              onImageGenerated={handleAIImageSelect} 
              externalPrompt={memePrompt}
              onPromptChange={setMemePrompt}
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

            {/* Social Media Links */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <Label className="text-sm font-medium text-muted-foreground">
                Social Links (optional)
              </Label>
              
              <div className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="telegramUrl" className="text-xs font-medium">
                    Telegram
                  </Label>
                  <Input
                    id="telegramUrl"
                    placeholder="https://t.me/your-channel"
                    value={tokenData.telegram_url}
                    onChange={(e) => setTokenData(prev => ({ ...prev, telegram_url: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="xUrl" className="text-xs font-medium">
                    X (Twitter)
                  </Label>
                  <Input
                    id="xUrl"
                    placeholder="https://x.com/your-handle"
                    value={tokenData.x_url}
                    onChange={(e) => setTokenData(prev => ({ ...prev, x_url: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Launch Button */}
        <div className="mt-6">
          <Button 
            variant="neon" 
            size="xl" 
            className="w-full h-14 text-lg font-bold"
            disabled={!tokenData.name || !tokenData.symbol || isCreating || !isAuthenticated}
            onClick={handleLaunchToken}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={20} />
                Creating Token...
              </>
            ) : (
              <>
                <Wallet className="mr-2" size={20} />
                {isAuthenticated ? 'Launch for 0.02 SOL (~$3)' : 'Connect Wallet to Launch'}
              </>
            )}
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
