
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Sparkles, Image, RefreshCw } from 'lucide-react';
import { useAIImageGenerator } from '@/hooks/useAIImageGenerator';

interface AIMemeGeneratorProps {
  onImageGenerated: (imageUrl: string) => void;
}

const AIMemeGenerator = ({ onImageGenerated }: AIMemeGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const { generateMemeImage, isGenerating } = useAIImageGenerator();

  const handleGenerate = async () => {
    const imageUrl = await generateMemeImage(prompt);
    if (imageUrl) {
      onImageGenerated(imageUrl);
      setPrompt('');
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
        <div className="flex items-center gap-2">
          <Image className="text-accent" size={16} />
          <span className="text-sm font-medium">AI Meme Generator</span>
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Describe your meme (e.g., 'doge with laser eyes')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="bg-input border-border"
          />
          
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
            variant="outline"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin mr-2" size={16} />
                Forging Meme...
              </>
            ) : (
              <>
                <Sparkles className="mr-2" size={16} />
                Generate Meme
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
                onClick={() => setPrompt(quickPrompt)}
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
