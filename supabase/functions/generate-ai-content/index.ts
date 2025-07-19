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
              content: 'You are a creative assistant that generates catchy names and symbols for meme cryptocurrencies. Generate 5 creative token names and 5 corresponding symbols (3-5 characters each) based on the user prompt. Return as JSON with arrays "names" and "symbols".'
            },
            {
              role: 'user',
              content: `Generate token names and symbols for: ${prompt}. Context: ${context || 'fun meme cryptocurrency'}`
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
        const suggestions = JSON.parse(content);
        
        return new Response(
          JSON.stringify(suggestions),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return new Response(
          JSON.stringify({
            names: ['CryptoMeme', 'MoonToken', 'DiamondHands', 'RocketCoin', 'LamboToken'],
            symbols: ['MEME', 'MOON', 'DIAM', 'RCKT', 'LMBO']
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