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
import { supabase } from "@/integrations/supabase/client";

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
    
    // Define prompt categories with multiple variations
    const promptCategories = {
      doge: [
        `${tokenName} shiba inu with laser eyes and diamond paws`,
        `${tokenName} doge wearing sunglasses on a rocket`,
        `${tokenName} muscular doge flexing with crypto coins`,
        `${tokenName} doge astronaut floating in space with moon`,
        `${tokenName} doge king wearing a golden crown`,
        `${tokenName} cyber doge with neon glowing eyes`
      ],
      pepe: [
        `${tokenName} pepe the frog with diamond hands`,
        `${tokenName} rare pepe wearing a tuxedo`,
        `${tokenName} pepe riding a rocket to the moon`,
        `${tokenName} pepe as a crypto trader with charts`,
        `${tokenName} golden pepe with rainbow background`,
        `${tokenName} pepe wizard casting money spells`
      ],
      cat: [
        `${tokenName} cool cat with crypto sunglasses`,
        `${tokenName} ninja cat holding diamond swords`,
        `${tokenName} space cat floating with stars`,
        `${tokenName} pirate cat with treasure chest`,
        `${tokenName} cyber cat with neon fur`,
        `${tokenName} royal cat on a golden throne`
      ],
      moon: [
        `${tokenName} rocket ship blasting to the moon`,
        `${tokenName} astronaut planting flag on moon`,
        `${tokenName} lunar base with crypto symbols`,
        `${tokenName} moon with diamond craters`,
        `${tokenName} spaceship with rainbow trail`,
        `${tokenName} cosmic journey through stars`
      ],
      rocket: [
        `${tokenName} rocket with fire trails and diamonds`,
        `${tokenName} spaceship launching with coins`,
        `${tokenName} rocket breaking through clouds`,
        `${tokenName} futuristic rocket with neon glow`,
        `${tokenName} rocket surrounded by lightning`,
        `${tokenName} golden rocket with treasure trail`
      ],
      diamond: [
        `${tokenName} giant diamond with laser beams`,
        `${tokenName} diamond hands crushing obstacles`,
        `${tokenName} crystal palace with gems`,
        `${tokenName} diamond rain from the sky`,
        `${tokenName} sparkling diamonds in space`,
        `${tokenName} diamond crown with royal cape`
      ],
      bull: [
        `${tokenName} charging bull with golden horns`,
        `${tokenName} crypto bull breaking walls`,
        `${tokenName} bull wearing diamond armor`,
        `${tokenName} electric bull with lightning`,
        `${tokenName} bull riding a rocket`,
        `${tokenName} mechanical bull with gears`
      ],
      bear: [
        `${tokenName} dancing bear with party hat`,
        `${tokenName} bear wearing diamond chains`,
        `${tokenName} cosmic bear floating in space`,
        `${tokenName} bear DJ with turntables`,
        `${tokenName} ninja bear with throwing stars`,
        `${tokenName} bear king on a mountain`
      ],
      ape: [
        `${tokenName} gorilla with diamond fists`,
        `${tokenName} ape wearing a crown and cape`,
        `${tokenName} cyber ape with robot arms`,
        `${tokenName} ape swinging on vines of coins`,
        `${tokenName} ape astronaut in space suit`,
        `${tokenName} wise ape with golden staff`
      ],
      shark: [
        `${tokenName} shark with laser fins`,
        `${tokenName} space shark swimming through stars`,
        `${tokenName} mechanical shark with gears`,
        `${tokenName} shark wearing sunglasses`,
        `${tokenName} golden shark with treasure`,
        `${tokenName} cyber shark with neon stripes`
      ],
      lion: [
        `${tokenName} lion with golden mane and crown`,
        `${tokenName} cosmic lion roaring lightning`,
        `${tokenName} lion king on diamond throne`,
        `${tokenName} mechanical lion with steam`,
        `${tokenName} lion wearing royal armor`,
        `${tokenName} lion with rainbow mane`
      ],
      wolf: [
        `${tokenName} wolf howling at diamond moon`,
        `${tokenName} pack leader wolf with crown`,
        `${tokenName} cyber wolf with glowing eyes`,
        `${tokenName} wolf riding through cosmos`,
        `${tokenName} wolf warrior with battle scars`,
        `${tokenName} mystical wolf with magic aura`
      ],
      fire: [
        `${tokenName} phoenix rising from flames`,
        `${tokenName} dragon breathing rainbow fire`,
        `${tokenName} fire spirit dancing with coins`,
        `${tokenName} volcano erupting diamonds`,
        `${tokenName} flame tornado with treasures`,
        `${tokenName} fire sword cutting through darkness`
      ],
      ice: [
        `${tokenName} ice wizard casting spells`,
        `${tokenName} frozen castle with crystals`,
        `${tokenName} ice dragon with diamond scales`,
        `${tokenName} arctic fox with glowing fur`,
        `${tokenName} ice queen with snow crown`,
        `${tokenName} frozen treasure chest glowing`
      ],
      gold: [
        `${tokenName} golden statue coming to life`,
        `${tokenName} treasure chest overflowing with coins`,
        `${tokenName} midas touch turning everything gold`,
        `${tokenName} golden dragon hoarding treasure`,
        `${tokenName} pirate map leading to gold`,
        `${tokenName} golden armor gleaming in sunlight`
      ]
    };

    // Generic creative prompts for tokens that don't match categories
    const genericPrompts = [
      `${tokenName} superhero character with cape and mask`,
      `${tokenName} magical wizard casting rainbow spells`,
      `${tokenName} pirate captain on treasure ship`,
      `${tokenName} ninja warrior with glowing weapons`,
      `${tokenName} robot guardian with laser eyes`,
      `${tokenName} dragon rider soaring through clouds`,
      `${tokenName} crystal golem with gem heart`,
      `${tokenName} space explorer with alien friends`,
      `${tokenName} time traveler with cosmic portal`,
      `${tokenName} storm elemental controlling lightning`,
      `${tokenName} forest guardian with nature powers`,
      `${tokenName} cyber punk hacker with neon setup`,
      `${tokenName} gladiator warrior in diamond arena`,
      `${tokenName} phantom assassin with shadow powers`,
      `${tokenName} alchemist brewing golden potions`,
      `${tokenName} sky dancer floating on clouds`,
      `${tokenName} ocean king ruling underwater realm`,
      `${tokenName} mountain climber reaching peak`,
      `${tokenName} speed racer with rocket car`,
      `${tokenName} chef cooking magical feast`,
      `${tokenName} artist painting reality with brush`,
      `${tokenName} musician creating cosmic symphony`,
      `${tokenName} inventor building flying machine`,
      `${tokenName} explorer discovering new worlds`,
      `${tokenName} guardian angel with golden wings`
    ];

    // Find matching category
    for (const [category, prompts] of Object.entries(promptCategories)) {
      if (name.includes(category) || name.includes(category.slice(0, -1))) {
        return prompts[Math.floor(Math.random() * prompts.length)];
      }
    }

    // Check for additional keyword variations
    const keywordMappings = {
      'dog': 'doge',
      'frog': 'pepe', 
      'kitty': 'cat',
      'kitten': 'cat',
      'lunar': 'moon',
      'blast': 'rocket',
      'launch': 'rocket',
      'gem': 'diamond',
      'crystal': 'diamond',
      'hands': 'diamond',
      'hodl': 'diamond',
      'bullish': 'bull',
      'bearish': 'bear',
      'monkey': 'ape',
      'gorilla': 'ape',
      'flame': 'fire',
      'burn': 'fire',
      'frozen': 'ice',
      'snow': 'ice',
      'cold': 'ice',
      'treasure': 'gold',
      'rich': 'gold',
      'money': 'gold'
    };

    for (const [keyword, category] of Object.entries(keywordMappings)) {
      if (name.includes(keyword)) {
        const prompts = promptCategories[category as keyof typeof promptCategories];
        return prompts[Math.floor(Math.random() * prompts.length)];
      }
    }

    // Return random generic prompt if no category matches
    return genericPrompts[Math.floor(Math.random() * genericPrompts.length)];
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    try {
      toast.info('Uploading image...');
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExtension}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('token-images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('token-images')
        .getPublicUrl(fileName);

      setTokenData(prev => ({ ...prev, image: publicUrl }));
      toast.success('Image uploaded successfully!');
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image. Please try again.');
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
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" size="icon" type="button">
                    <Upload size={16} />
                  </Button>
                </div>
              </div>
              {tokenData.image && (
                <div className="flex items-center gap-2 mt-2">
                  <img 
                    src={tokenData.image} 
                    alt="Token preview" 
                    className="w-10 h-10 rounded object-cover border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      // You could add a simple image viewer here too if needed
                    }}
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
