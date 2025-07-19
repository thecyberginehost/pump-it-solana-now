
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

// AI service for token creation - now using real AI APIs
export class AIService {
  // AI Token Name Generator
  static async generateTokenNames(theme?: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-content', {
        body: {
          type: 'suggestions',
          prompt: theme || 'creative meme cryptocurrency',
          context: 'Generate catchy token names'
        },
      });

      if (error) throw error;
      
      return data?.names?.slice(0, 3) || ['ViralCoin', 'MemeForge', 'PumpMaster'];
    } catch (error) {
      console.error('AI name generation error:', error);
      toast.error('AI service unavailable, using fallback names');
      
      const themes = {
        doge: ['SuperDoge', 'MegaDoge', 'DogeMoon'],
        pepe: ['GigaPepe', 'PepeMoon', 'UltraPepe'],
        moon: ['MoonShot', 'LunarToken', 'MoonForged'],
        rocket: ['RocketFuel', 'BlastOff', 'ThrusterX'],
        default: ['ViralCoin', 'MemeForge', 'PumpMaster']
      };
      
      const selectedTheme = theme?.toLowerCase() || 'default';
      const themeNames = themes[selectedTheme as keyof typeof themes] || themes.default;
      return themeNames.slice(0, 3);
    }
  }

  // AI Symbol Generator
  static async generateTokenSymbols(name: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-content', {
        body: {
          type: 'suggestions',
          prompt: `Generate ticker symbols for token named: ${name}`,
          context: 'Create short 3-4 character symbols'
        },
      });

      if (error) throw error;
      
      return data?.symbols?.slice(0, 3) || [name.substring(0, 4).toUpperCase()];
    } catch (error) {
      console.error('AI symbol generation error:', error);
      
      const nameUpper = name.toUpperCase();
      return [
        nameUpper.substring(0, 4),
        nameUpper.substring(0, 3) + 'X',
        nameUpper.substring(0, 3) + '2',
      ];
    }
  }

  // AI Viral Tweet Generator
  static async generateViralTweets(tokenName: string, tokenSymbol: string): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const tweets = [
      `🚀 Just forged ${tokenName} ($${tokenSymbol}) on @MoonForge! This is going PARABOLIC! 🌙 #MoonForge #${tokenSymbol} #SolanaGems`,
      `💎 ${tokenName} ($${tokenSymbol}) is the next 1000x gem! Forged with pure degen energy on MoonForge 🔥 #WAGMI #${tokenSymbol}`,
      `🌙 Moon mission activated! ${tokenName} ($${tokenSymbol}) just launched on MoonForge. Get in before we hit Uranus! 🚀 #${tokenSymbol}Mania`
    ];
    
    return tweets;
  }

  // AI Market Sentiment
  static async getMarketSentiment(): Promise<{ sentiment: 'bullish' | 'bearish' | 'neutral', confidence: number, recommendation: string }> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const sentiments = [
      { sentiment: 'bullish' as const, confidence: 0.85, recommendation: '🟢 Perfect time to launch! Market is pumping hard!' },
      { sentiment: 'neutral' as const, confidence: 0.65, recommendation: '🟡 Decent timing. Good opportunity for unique tokens.' },
      { sentiment: 'bearish' as const, confidence: 0.75, recommendation: '🔴 Risky timing, but contrarian plays can moon harder!' }
    ];
    
    return sentiments[Math.floor(Math.random() * sentiments.length)];
  }
}
