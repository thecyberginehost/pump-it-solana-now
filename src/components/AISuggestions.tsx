
import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Sparkles, RefreshCw, Copy, TrendingUp } from 'lucide-react';
import { AIService } from '@/services/aiService';
import { toast } from 'sonner';

interface AISuggestionsProps {
  onNameSelect: (name: string) => void;
  onSymbolSelect: (symbol: string) => void;
  currentName?: string;
}

const AISuggestions = ({ onNameSelect, onSymbolSelect, currentName }: AISuggestionsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState<any>(null);

  const generateSuggestions = async (theme?: string) => {
    setIsLoading(true);
    try {
      const [names, marketSentiment] = await Promise.all([
        AIService.generateTokenNames(theme),
        AIService.getMarketSentiment()
      ]);
      
      setSuggestions(names);
      setSentiment(marketSentiment);
      
      if (names.length > 0) {
        const symbolSuggestions = await AIService.generateTokenSymbols(names[0]);
        setSymbols(symbolSuggestions);
      }
      
      toast.success('🤖 AI suggestions generated!');
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSymbolsForName = async (name: string) => {
    if (!name) return;
    
    try {
      const symbolSuggestions = await AIService.generateTokenSymbols(name);
      setSymbols(symbolSuggestions);
    } catch (error) {
      console.error('Failed to generate symbols:', error);
    }
  };

  return (
    <Card className="border-accent/20 bg-card/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-accent" size={16} />
            <span className="text-sm font-medium">AI Forge Assistant</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateSuggestions()}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="animate-spin" size={12} />
            ) : (
              <Sparkles size={12} />
            )}
            Generate
          </Button>
        </div>

        {sentiment && (
          <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} />
              <span className="text-xs font-medium">Market Vibe Check</span>
            </div>
            <p className="text-xs text-muted-foreground">{sentiment.recommendation}</p>
          </div>
        )}

        {suggestions.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">🤖 AI Name Suggestions:</p>
            <div className="flex flex-wrap gap-1">
              {suggestions.map((name) => (
                <Button
                  key={name}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    onNameSelect(name);
                    generateSymbolsForName(name);
                  }}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {symbols.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">🔤 Symbol Suggestions:</p>
            <div className="flex flex-wrap gap-1">
              {symbols.map((symbol) => (
                <Button
                  key={symbol}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => onSymbolSelect(symbol)}
                >
                  ${symbol}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => generateSuggestions('doge')}
            disabled={isLoading}
          >
            🐕 Doge Theme
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => generateSuggestions('pepe')}
            disabled={isLoading}
          >
            🐸 Pepe Theme
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => generateSuggestions('moon')}
            disabled={isLoading}
          >
            🌙 Moon Theme
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISuggestions;
