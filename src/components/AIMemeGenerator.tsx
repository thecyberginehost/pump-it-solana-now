
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Sparkles, Image, RefreshCw, Crown } from 'lucide-react';
import { useAIServices } from '@/hooks/useAIServices';

interface AIMemeGeneratorProps {
  onImageGenerated: (imageUrl: string) => void;
  externalPrompt?: string;
  onPromptChange?: (prompt: string) => void;
  isPremium?: boolean;
}

const AIMemeGenerator = ({ onImageGenerated, externalPrompt = '', onPromptChange, isPremium = false }: AIMemeGeneratorProps) => {
  const [internalPrompt, setInternalPrompt] = useState('');
  const { generateImage, isGeneratingImage } = useAIServices();

  // Use external prompt if provided, otherwise use internal state
  const prompt = externalPrompt || internalPrompt;

  const handlePromptChange = (newPrompt: string) => {
    if (onPromptChange) {
      onPromptChange(newPrompt);
    } else {
      setInternalPrompt(newPrompt);
    }
  };

  const handleGenerate = async () => {
    const imageUrl = await generateImage(prompt);
    if (imageUrl) {
      onImageGenerated(imageUrl);
      handlePromptChange('');
    }
  };

  const quickPrompts = [
    '🐕 Shiba Inu with sunglasses',
    '🐸 Pepe the frog smiling',
    '🚀 Rocket to the moon',
    '💎 Diamond hands',
    '🔥 Fire doge meme'
  ];

  return (
    <Card className="border-accent/20 bg-card/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="text-accent" size={16} />
            <span className="text-sm font-medium">AI Meme Generator</span>
          </div>
          {isPremium && (
            <div className="flex items-center gap-1 text-xs bg-gradient-electric text-black px-2 py-1 rounded-full">
              <Crown size={12} />
              Unlimited
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Describe your meme (e.g., 'doge with laser eyes')"
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            className="bg-input border-border"
          />
          
          <Button
            onClick={handleGenerate}
            disabled={isGeneratingImage || !prompt.trim()}
            className="w-full"
            variant="outline"
          >
            {isGeneratingImage ? (
              <>
                <RefreshCw className="animate-spin mr-2" size={16} />
                Forging Meme...
              </>
            ) : (
              <>
                <Sparkles className="mr-2" size={16} />
                Generate Meme
                {!isPremium && <span className="ml-1 text-xs">(0.02 SOL)</span>}
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Quick Ideas:</p>
          <div className="flex flex-wrap gap-1">
            {quickPrompts.map((quickPrompt) => (
              <Button
                key={quickPrompt}
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => handlePromptChange(quickPrompt)}
              >
                {quickPrompt}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIMemeGenerator;
