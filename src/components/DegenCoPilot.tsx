import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Bot, 
  Send, 
  Zap, 
  TrendingUp, 
  MessageSquare, 
  Sparkles,
  Target,
  BarChart3
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  promptType?: string;
}

interface DegenCoPilotProps {
  tokenName?: string;
  tokenSymbol?: string;
}

const QUICK_PROMPTS = [
  {
    id: 'viral_plan',
    title: 'Viral Launch Strategy',
    description: 'Comprehensive 72-hour viral marketing plan',
    icon: <Target className="h-4 w-4" />,
    prompt: "Create a detailed 72-hour viral marketing strategy for my token launch. Include specific tactics, timing, platforms, and target metrics for maximum viral potential."
  },
  {
    id: 'viral_post',
    title: 'Viral Twitter Content',
    description: 'High-engagement Twitter posts & threads',
    icon: <MessageSquare className="h-4 w-4" />,
    prompt: "Create 3 different viral Twitter posts for my token: 1) Launch announcement, 2) Community engagement post, 3) FOMO-inducing thread. Include emojis, hashtags, and engagement hooks."
  },
  {
    id: 'trend_research',
    title: 'Market Intelligence',
    description: 'Current trends & positioning opportunities',
    icon: <TrendingUp className="h-4 w-4" />,
    prompt: "Analyze current crypto market trends and viral narratives. How can I position my token to ride these trends? What opportunities exist in the next 48 hours?"
  },
  {
    id: 'community_strategy',
    title: 'Community Building',
    description: 'Engagement tactics & growth strategies',
    icon: <BarChart3 className="h-4 w-4" />,
    prompt: "Design a community building strategy to grow from 0 to 1000 engaged holders in 30 days. Include Discord/Telegram tactics, holder rewards, and viral mechanics."
  },
  {
    id: 'influencer_outreach',
    title: 'Influencer Strategy',
    description: 'KOL outreach & collaboration tactics',
    icon: <Sparkles className="h-4 w-4" />,
    prompt: "Create an influencer outreach strategy for my token. Who should I target, what should I offer, and how do I approach them for maximum success?"
  },
  {
    id: 'crisis_management',
    title: 'Reputation Management',
    description: 'Handle FUD & negative sentiment',
    icon: <Bot className="h-4 w-4" />,
    prompt: "My token is facing negative sentiment/FUD. Create a crisis management plan to turn this around and rebuild community confidence."
  }
];

export const DegenCoPilot: React.FC<DegenCoPilotProps> = ({ 
  tokenName, 
  tokenSymbol 
}) => {
  const { isAuthenticated, walletAddress } = useWalletAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(30);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadCreditsRemaining();
  }, [isAuthenticated, walletAddress]);

  const loadCreditsRemaining = async () => {
    if (!isAuthenticated || !walletAddress) return;
    
    try {
      // For now, just set default credits since the table doesn't exist yet
      setCreditsRemaining(30);
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const sendMessage = async (message: string, promptType: string = 'general') => {
    if (!isAuthenticated || !walletAddress) {
      toast.error('Please connect your wallet to use Degen CoPilot');
      return;
    }

    if (!message.trim() || isLoading) return;

    if (creditsRemaining <= 0) {
      toast.error('Daily credit limit reached! Credits reset at midnight UTC.');
      return;
    }

    setIsLoading(true);
    
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: message,
      isUser: true,
      timestamp: new Date(),
      promptType
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('degen-copilot', {
        body: {
          message,
          userId: walletAddress,
          tokenName,
          tokenSymbol,
          sessionId,
          promptType
        },
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        content: data.response,
        isUser: false,
        timestamp: new Date(),
        promptType
      };

      setMessages(prev => [...prev, aiMessage]);
      setCreditsRemaining(data.creditsRemaining);
      
      toast.success(`Response generated! ${data.creditsRemaining} credits remaining`);
      
    } catch (error: any) {
      console.error('CoPilot error:', error);
      toast.error(error.message || 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: { prompt: string; id: string }) => {
    sendMessage(prompt.prompt, prompt.id);
  };

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Bot className="h-6 w-6" />
            Degen CoPilot
          </CardTitle>
          <p className="text-muted-foreground">
            Connect your wallet to access your AI marketing assistant
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Degen CoPilot
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {creditsRemaining} credits
          </Badge>
        </div>
        {tokenName && (
          <p className="text-sm text-muted-foreground">
            Optimizing for: <span className="font-medium">{tokenName} (${tokenSymbol})</span>
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Choose Your Mission</h3>
              <p className="text-sm text-muted-foreground">
                Select a specialized marketing strategy or ask me anything
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {QUICK_PROMPTS.map((prompt) => (
                <Button
                  key={prompt.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 text-left hover:bg-accent/10 transition-all"
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={isLoading || creditsRemaining <= 0}
                >
                  <div className="flex items-center gap-2 w-full">
                    {prompt.icon}
                    <span className="font-medium text-sm">{prompt.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {prompt.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.promptType && !message.isUser && (
                      <Badge variant="outline" className="mb-2 text-xs">
                        {QUICK_PROMPTS.find(p => p.id === message.promptType)?.title || 'General'}
                      </Badge>
                    )}
                    <div className="whitespace-pre-wrap text-sm">
                      {message.content}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 animate-pulse" />
                      <span className="text-sm">Degen CoPilot is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
        )}

        <Separator />

        <div className="flex gap-2">
          <Input
            placeholder="Ask Degen CoPilot anything about viral marketing..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(inputMessage);
              }
            }}
            disabled={isLoading || creditsRemaining <= 0}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage(inputMessage)}
            disabled={!inputMessage.trim() || isLoading || creditsRemaining <= 0}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {creditsRemaining <= 5 && (
          <p className="text-xs text-amber-600 text-center">
            ⚠️ Running low on credits! {creditsRemaining} remaining. Credits reset daily at midnight UTC.
          </p>
        )}
      </CardContent>
    </Card>
  );
};