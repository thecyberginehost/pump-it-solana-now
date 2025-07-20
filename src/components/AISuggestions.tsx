
import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Sparkles, RefreshCw, Crown } from 'lucide-react';
import { AIService } from '@/services/aiService';
import { toast } from 'sonner';

interface AISuggestionsProps {
  onNameSelect: (name: string) => void;
  onSymbolSelect: (symbol: string) => void;
  currentName: string;
  isPremium?: boolean;
}

const AISuggestions = ({ onNameSelect, onSymbolSelect, currentName, isPremium = false }: AISuggestionsProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<{names: string[], symbols: string[]}>({
    names: [],
    symbols: []
  });
  const [selectedTheme, setSelectedTheme] = useState('');

  const themes = ['doge', 'pepe', 'moon', 'rocket'];

  const generateSuggestions = async (theme?: string) => {
    if (!isPremium) {
      toast.info('💰 Premium AI Generation - 0.01 SOL', {
        description: 'This will charge 0.01 SOL for AI-powered suggestions'
      });
    }

    setIsGenerating(true);
    try {
      const names = await AIService.generateTokenNames(theme);
      setSuggestions(prev => ({ ...prev, names }));
      
      if (names.length > 0) {
        // Generate symbols for each name individually
        const symbols = [];
        for (const name of names) {
          const nameSymbols = await AIService.generateTokenSymbols(name);
          symbols.push(nameSymbols[0]); // Take the first/best symbol for each name
        }
        setSuggestions(prev => ({ ...prev, symbols }));
      }
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSymbols = async () => {
    if (!currentName) {
      toast.error('Enter a token name first');
      return;
    }

    if (!isPremium) {
      toast.info('💰 Premium AI Generation - 0.01 SOL', {
        description: 'This will charge 0.01 SOL for AI symbol suggestions'
      });
    }

    setIsGenerating(true);
    try {
      const symbols = await AIService.generateTokenSymbols(currentName);
      setSuggestions(prev => ({ ...prev, symbols }));
    } catch (error) {
      toast.error('Failed to generate symbols');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-accent/20 bg-card/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-accent" size={16} />
            <span className="text-sm font-medium">AI Token Suggestions</span>
          </div>
          {isPremium && (
            <div className="flex items-center gap-1 text-xs bg-gradient-electric text-black px-2 py-1 rounded-full">
              <Crown size={12} />
              Unlimited
            </div>
          )}
        </div>

        {/* Theme Selection */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Quick Themes:</p>
          <div className="flex gap-2">
            {themes.map((theme) => (
              <Button
                key={theme}
                variant={selectedTheme === theme ? "electric" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedTheme(theme);
                  generateSuggestions(theme);
                }}
                disabled={isGenerating}
              >
                {theme}
              </Button>
            ))}
          </div>
        </div>

        {/* Token Suggestions - Name/Symbol Pairs */}
        {suggestions.names.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Suggested Token Names & Symbols:</p>
            <div className="space-y-2">
              {suggestions.names.map((name, index) => (
                <div key={name} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNameSelect(name)}
                    className="text-sm font-medium flex-1 justify-start"
                  >
                    {name}
                  </Button>
                  <span className="text-muted-foreground">→</span>
                  {suggestions.symbols[index] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSymbolSelect(suggestions.symbols[index])}
                      className="text-sm font-mono"
                    >
                      ${suggestions.symbols[index]}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => generateSuggestions()}
            disabled={isGenerating}
            className="flex-1"
            variant="outline"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin mr-2" size={16} />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2" size={16} />
                Generate Names
                {!isPremium && <span className="ml-1 text-xs">(0.01 SOL)</span>}
              </>
            )}
          </Button>
          
          <Button
            onClick={generateSymbols}
            disabled={isGenerating || !currentName}
            variant="outline"
          >
            Symbols
            {!isPremium && <span className="ml-1 text-xs">(0.01 SOL)</span>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISuggestions;
