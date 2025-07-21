
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Sparkles, Image, RefreshCw, Crown, Eye } from 'lucide-react';
import { useAIServices } from '@/hooks/useAIServices';
import ImageViewer from './ImageViewer';

interface AIMemeGeneratorProps {
  onImageGenerated: (imageUrl: string) => void;
  externalPrompt?: string;
  onPromptChange?: (prompt: string) => void;
  isPremium?: boolean;
}

const AIMemeGenerator = ({ onImageGenerated, externalPrompt = '', onPromptChange, isPremium = false }: AIMemeGeneratorProps) => {
  const [internalPrompt, setInternalPrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
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
      setGeneratedImageUrl(imageUrl);
      onImageGenerated(imageUrl);
      handlePromptChange('');
    }
  };

  const handleImageClick = () => {
    if (generatedImageUrl) {
      setImageViewerOpen(true);
    }
  };

  const handleImageUpdate = (newImageUrl: string) => {
    setGeneratedImageUrl(newImageUrl);
    onImageGenerated(newImageUrl);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const quickPrompts = [
    '🐕 Shiba Inu with sunglasses',
    '🐸 Pepe the frog smiling',
    '🚀 Rocket to the moon',
    '💎 Diamond hands',
    '🔥 Fire doge meme'
  ];

  return (
    <>
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

          {/* Generated Image Preview */}
          {generatedImageUrl && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Generated Image:</p>
              <div className="relative group">
                <img 
                  src={generatedImageUrl} 
                  alt="Generated meme" 
                  className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handleImageClick}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Click to expand and edit
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      {generatedImageUrl && (
        <ImageViewer
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          imageUrl={generatedImageUrl}
          onImageUpdate={handleImageUpdate}
          onRegenerate={handleRegenerate}
        />
      )}
    </>
  );
};

export default AIMemeGenerator;
