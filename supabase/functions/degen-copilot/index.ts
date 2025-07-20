import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Specialized system prompts for different copilot functions
const SYSTEM_PROMPTS = {
  viral_plan: `You are Degen CoPilot, an expert in cryptocurrency viral marketing and meme culture. You specialize in creating comprehensive viral marketing strategies for newly launched meme tokens.

KEY EXPERTISE:
- Deep understanding of crypto Twitter culture, memes, and viral mechanics
- Expert knowledge of successful token launches (DOGE, SHIB, PEPE, WIF, BONK)
- Current crypto trends, influencer networks, and community building
- Platform-specific strategies (Twitter, TikTok, Discord, Telegram, Reddit)
- Timing strategies based on market cycles and crypto community behavior

VIRAL STRATEGY FRAMEWORK:
1. Phase 1: Launch Momentum (0-24hrs) - Maximum attention capture
2. Phase 2: Community Building (1-7 days) - Sustainable engagement
3. Phase 3: Ecosystem Expansion (Week 2+) - Broader market penetration

Always provide specific, actionable tactics with exact timing, target metrics, and resource requirements.`,

  viral_post: `You are Degen CoPilot, the ultimate crypto Twitter viral content creator. You understand the psychology of what makes crypto content go viral.

VIRAL CONTENT PRINCIPLES:
- Emotional triggers: FOMO, excitement, community belonging, humor
- Current meta: What's trending NOW in crypto Twitter
- Engagement hooks: Questions, polls, challenges, controversies
- Visual elements: Emojis, formatting, thread structures
- Timing: Optimal posting windows for crypto audiences
- Community psychology: Ape mentality, diamond hands culture, moon mission narrative

CONTENT FORMATS YOU MASTER:
- Single viral tweets with maximum engagement
- Twitter threads that build anticipation
- Quote tweet strategies for amplification
- Reply strategies for trending topics
- Cross-platform content adaptation

Generate content that crypto degeners MUST engage with. Use current slang, relevant memes, and proven viral patterns.`,

  trend_research: `You are Degen CoPilot's trend research specialist with real-time access to crypto market intelligence.

RESEARCH CAPABILITIES:
- Current trending cryptocurrencies and narratives
- Viral meme patterns and emerging crypto culture
- Influencer activity and endorsement patterns
- Market sentiment and FOMO cycles
- Platform-specific trending topics (CT, TikTok, Reddit)
- Upcoming events, catalysts, and market opportunities

Provide actionable intelligence that creators can use immediately to position their tokens within current trends.`,

  general: `You are Degen CoPilot, the ultimate AI assistant for meme token creators. You combine deep crypto knowledge with viral marketing expertise.

CORE COMPETENCIES:
- Viral content creation and strategy
- Community building and engagement
- Market trend analysis and positioning
- Crisis management and reputation
- Cross-platform growth strategies
- Token economics and utility brainstorming

You speak the language of crypto degeners while providing professional-grade marketing advice. Always be actionable, specific, and results-focused.`
};

// Knowledge base of successful viral crypto campaigns
const VIRAL_KNOWLEDGE_BASE = `
SUCCESSFUL VIRAL PATTERNS:

1. DOGECOIN SUCCESS FACTORS:
- Meme simplicity and universal appeal
- Celebrity endorsements (Elon Musk effect)
- Community-driven narrative
- "Do Only Good Everyday" messaging
- Consistent branding across platforms

2. SHIBA INU VIRAL MECHANICS:
- "Dogecoin killer" positioning against established player
- Community-driven ecosystem building
- Mystery founder creating intrigue
- Burn mechanisms creating scarcity narrative
- Multi-platform coordinated campaigns

3. PEPE 2023 EXPLOSION:
- Nostalgic meme revival timing
- Simple, recognizable branding
- Organic community growth
- No roadmap = pure meme play
- Strategic silence from team

4. RECENT VIRAL WINNERS (2024):
- WIF: Simple hat meme, TikTok-friendly
- BONK: Solana ecosystem play, community airdrop
- MYRO: Celebrity pet angle (Solana founder's dog)
- POPCAT: Sound-based meme, interactive element

CURRENT META TRENDS:
- AI + Crypto narrative
- Dog-themed tokens on Solana
- Sound/music-based memes
- Celebrity pet tokens
- Community takeover stories
- Burn mechanism narratives
- Cross-chain bridge plays

PLATFORM-SPECIFIC TACTICS:
Twitter: Quote tweet trending topics, engage with KOLs, use viral hashtags
TikTok: Sound trends, challenge creation, influencer collabs
Reddit: Organic community posts, AMA sessions, meme creation
Discord/Telegram: Community raids, coordinated posting, ambassador programs
`;

async function searchCurrentTrends(query: string): Promise<string> {
  // This would integrate with a real-time data source in production
  // For now, return structured trend information
  return `
CURRENT CRYPTO TRENDS (Live Data Simulation):

🔥 TRENDING NOW:
- AI agent tokens gaining momentum
- Solana meme coin revival 
- "Based" narrative tokens
- Celebrity token launches
- DeFi yield farming comeback

📊 VIRAL METRICS:
- Peak engagement times: 9-11am EST, 7-9pm EST
- Trending hashtags: #SolanaGems #AITokens #MemeCoinSeason
- Top influencers posting: @CryptoBeast, @AltcoinSherpa, @DeFiDegen

💡 OPPORTUNITY WINDOWS:
- Weekend pump momentum building
- Major exchange listings expected
- Influencer collaboration opportunities
- Cross-chain bridge narratives trending

⚡ IMMEDIATE TACTICS:
- Engage with trending AI token discussions
- Create content around Solana ecosystem
- Position against established memes
- Leverage current market FOMO
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(
      'https://llvakqunvvheajwejpzm.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsdmFrcXVudnZoZWFqd2VqcHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTYxNjksImV4cCI6MjA2ODQ3MjE2OX0.B4G2bqu9muRFuviZRt7bs80UUVEVy5nbO0p55z7vmlQ'
    );

    const { 
      message, 
      userId, 
      tokenName, 
      tokenSymbol, 
      sessionId,
      promptType = 'general' 
    } = await req.json();

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message and userId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if user has credits remaining
    const { data: creditsData, error: creditsError } = await supabase
      .from('creator_credits')
      .select('daily_credits, last_reset')
      .eq('user_id', userId)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      throw new Error('Failed to check credits');
    }

    // If no credits record, create one
    if (!creditsData) {
      const { error: insertError } = await supabase
        .from('creator_credits')
        .insert({ user_id: userId, daily_credits: 29 }); // 30 - 1 for this request

      if (insertError) {
        throw new Error('Failed to initialize credits');
      }
    } else {
      // Check if user has credits
      if (creditsData.daily_credits <= 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Daily credit limit reached. Credits reset daily at midnight UTC.',
            creditsRemaining: 0 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }

      // Deduct a credit
      const { error: updateError } = await supabase
        .from('creator_credits')
        .update({ daily_credits: creditsData.daily_credits - 1 })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error('Failed to update credits');
      }
    }

    // Get current trends if needed
    let trendData = '';
    if (promptType === 'trend_research' || message.toLowerCase().includes('trend')) {
      trendData = await searchCurrentTrends(message);
    }

    // Build context-aware system prompt
    const systemPrompt = SYSTEM_PROMPTS[promptType as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.general;
    
    const enhancedPrompt = `${systemPrompt}

${VIRAL_KNOWLEDGE_BASE}

${trendData ? `CURRENT MARKET INTELLIGENCE:\n${trendData}` : ''}

TOKEN CONTEXT:
${tokenName ? `Token Name: ${tokenName}` : ''}
${tokenSymbol ? `Token Symbol: ${tokenSymbol}` : ''}

Provide specific, actionable advice that the creator can implement immediately. Be direct, strategic, and results-focused.`;

    // Generate response using GPT-4
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: enhancedPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    const aiResponse = data.choices[0].message.content;

    // Store the conversation
    if (sessionId) {
      await supabase
        .from('copilot_messages')
        .insert([
          {
            session_id: sessionId,
            user_id: userId,
            message: message,
            response: aiResponse,
            prompt_type: promptType
          }
        ]);
    }

    // Get updated credits count
    const { data: updatedCredits } = await supabase
      .from('creator_credits')
      .select('daily_credits')
      .eq('user_id', userId)
      .single();

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        creditsRemaining: updatedCredits?.daily_credits || 0,
        promptType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in Degen CoPilot:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});