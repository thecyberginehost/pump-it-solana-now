
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Sparkles, RefreshCw, Crown } from 'lucide-react';
import { AIService } from '@/services/aiService';
import { toast } from 'sonner';

interface AISuggestionsProps {
  onNameSelect: (name: string) => void;
  onSymbolSelect: (symbol: string) => void;
  onTokenSelect?: (name: string, symbol: string) => void;
  currentName: string;
  isPremium?: boolean;
}

const AISuggestions = ({ onNameSelect, onSymbolSelect, onTokenSelect, currentName, isPremium = false }: AISuggestionsProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<{names: string[], symbols: string[]}>({
    names: [],
    symbols: []
  });
  const [selectedTheme, setSelectedTheme] = useState('');
  const [customTheme, setCustomTheme] = useState('');

  const themes = ['doge', 'pepe', 'moon', 'rocket'];

  const generateSuggestions = async (theme?: string) => {
    if (!isPremium) {
      toast.info('💰 Premium AI Generation - 0.01 SOL', {
        description: 'This will charge 0.01 SOL for AI-powered suggestions'
      });
    }

    setIsGenerating(true);
    try {
      const response = await AIService.generateTokenNames(theme);
      
      // If we got back both names and symbols (new format), use them directly
      if (Array.isArray(response) && typeof response[0] === 'string') {
        // Old format - just names
        const names = response;
        setSuggestions(prev => ({ ...prev, names }));
        
        // Generate symbols for each name individually
        const symbols = [];
        for (const name of names) {
          const nameSymbols = await AIService.generateTokenSymbols(name);
          symbols.push(nameSymbols[0]); // Take the first/best symbol for each name
        }
        setSuggestions(prev => ({ ...prev, symbols }));
      } else {
        // New format - matched pairs should come directly from the service
        const names = response;
        setSuggestions(prev => ({ ...prev, names }));
        
        // Generate matching symbols for all names at once
        const symbols = [];
        for (const name of names) {
          const nameSymbols = await AIService.generateTokenSymbols(name);
          symbols.push(nameSymbols[0]);
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
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Quick Themes:</p>
          <div className="flex gap-2 flex-wrap">
            {themes.map((theme) => (
              <Button
                key={theme}
                variant={selectedTheme === theme ? "electric" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedTheme(theme);
                  setCustomTheme('');
                  generateSuggestions(theme);
                }}
                disabled={isGenerating}
              >
                {theme}
              </Button>
            ))}
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Custom Theme:</p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. cyberpunk, space, animals..."
                value={customTheme}
                onChange={(e) => {
                  setCustomTheme(e.target.value);
                  setSelectedTheme('');
                }}
                className="flex-1 text-sm"
                disabled={isGenerating}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateSuggestions(customTheme)}
                disabled={isGenerating || !customTheme.trim()}
              >
                Generate
              </Button>
            </div>
          </div>
        </div>

        {/* Token Suggestions - Name/Symbol Pairs */}
        {suggestions.names.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Suggested Token Names & Symbols:</p>
            <div className="space-y-2">
              {suggestions.names.map((name, index) => (
                <div key={name} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (onTokenSelect && suggestions.symbols[index]) {
                        onTokenSelect(name, suggestions.symbols[index]);
                      } else {
                        onNameSelect(name);
                      }
                    }}
                    className="text-sm font-medium flex-1 justify-start hover:bg-transparent"
                  >
                    {name}
                  </Button>
                  <span className="text-muted-foreground">→</span>
                  {suggestions.symbols[index] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (onTokenSelect) {
                          onTokenSelect(name, suggestions.symbols[index]);
                        } else {
                          onSymbolSelect(suggestions.symbols[index]);
                        }
                      }}
                      className="text-sm font-mono hover:bg-transparent"
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
