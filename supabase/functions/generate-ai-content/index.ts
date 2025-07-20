import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { type, prompt, context } = await req.json();

    if (!type || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type and prompt' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Generating AI content:', { type, prompt });

    if (type === 'image') {
      // Generate image using DALL-E
      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Create a professional crypto token logo for: ${prompt}. Make it clean, modern, and suitable for a cryptocurrency. Style should be minimalist with bold colors.`,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
      });

      const imageData = await imageResponse.json();
      
      if (!imageResponse.ok) {
        throw new Error(`OpenAI Image API error: ${imageData.error?.message || 'Unknown error'}`);
      }

      const imageUrl = imageData.data[0].url;

      // Download and store image in Supabase Storage
      const imageBlob = await fetch(imageUrl).then(r => r.blob());
      const fileName = `token-logo-${Date.now()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('token-images')
        .upload(fileName, imageBlob, {
          contentType: 'image/png',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Return the original URL if storage fails
        return new Response(
          JSON.stringify({ imageUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from('token-images')
        .getPublicUrl(fileName);

      return new Response(
        JSON.stringify({ imageUrl: publicUrlData.publicUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (type === 'suggestions') {
      // Generate name/symbol suggestions using GPT-4
      const suggestionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert cryptocurrency naming and branding specialist. You understand viral meme culture, crypto twitter psychology, and what makes tokens memorable and marketable.

NAMING PRINCIPLES:
- Keep names short, punchy, and memorable (3-10 characters)
- Use current crypto/meme trends and cultural references
- Consider pronunciation and how it sounds when spoken
- Think about hashtag potential and social media virality
- Avoid generic crypto terms like "moon," "safe," "baby" unless contextually clever

SYMBOL GUIDELINES:
- 3-5 characters maximum for optimal exchange compatibility
- Avoid confusion with existing major tokens
- Make it pronounceable and tweetable
- Consider ticker tape readability

Generate creative, marketable suggestions that would resonate with the current crypto community. Focus on originality and viral potential.`
            },
            {
              role: 'user',
              content: `Generate 5 creative token names and 5 corresponding symbols for: ${prompt}. Context: ${context || 'fun meme cryptocurrency that could go viral'}. Return as JSON with arrays "names" and "symbols".`
            }
          ],
          max_tokens: 500,
          temperature: 0.8,
        }),
      });

      const suggestionsData = await suggestionsResponse.json();
      
      if (!suggestionsResponse.ok) {
        throw new Error(`OpenAI Chat API error: ${suggestionsData.error?.message || 'Unknown error'}`);
      }

      try {
        const content = suggestionsData.choices[0].message.content;
        console.log('Raw OpenAI response:', content);
        
        // Try to extract JSON from the content if it's wrapped in markdown or other text
        let jsonContent = content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonContent = jsonMatch[0];
        }
        
        const suggestions = JSON.parse(jsonContent);
        
        // Validate the response structure
        if (!suggestions.names || !suggestions.symbols || !Array.isArray(suggestions.names) || !Array.isArray(suggestions.symbols)) {
          throw new Error('Invalid suggestions format from OpenAI');
        }
        
        return new Response(
          JSON.stringify(suggestions),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.log('Fallback: Generating random suggestions based on prompt');
        
        // Generate more varied fallback suggestions based on the prompt
        const timestamp = Date.now().toString().slice(-3);
        const themes = {
          doge: [`SuperDoge${timestamp}`, `MegaDoge${timestamp}`, `DogeMoon${timestamp}`],
          pepe: [`GigaPepe${timestamp}`, `PepeMoon${timestamp}`, `UltraPepe${timestamp}`],
          moon: [`MoonShot${timestamp}`, `LunarToken${timestamp}`, `MoonForged${timestamp}`],
          rocket: [`RocketFuel${timestamp}`, `BlastOff${timestamp}`, `ThrusterX${timestamp}`],
        };
        
        const promptLower = prompt.toLowerCase();
        let fallbackNames = [`ViralCoin${timestamp}`, `MemeForge${timestamp}`, `PumpMaster${timestamp}`];
        
        // Choose theme-based names if prompt matches
        for (const [theme, names] of Object.entries(themes)) {
          if (promptLower.includes(theme)) {
            fallbackNames = names;
            break;
          }
        }
        
        const fallbackSymbols = fallbackNames.map(name => 
          name.replace(/\d+$/, '').substring(0, 4).toUpperCase()
        );
        
        return new Response(
          JSON.stringify({
            names: fallbackNames,
            symbols: fallbackSymbols
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid type. Use "image" or "suggestions"' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Error generating AI content:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});