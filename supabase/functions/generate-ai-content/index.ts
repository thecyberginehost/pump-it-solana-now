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

    const { type, prompt, context, imageUrl: inputImageUrl } = await req.json();

    if (!type || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type and prompt' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Generating AI content:', { type, prompt, inputImageUrl });

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

      // Download and store image in Supabase Storage with hashed filename
      const imageBlob = await fetch(imageUrl).then(r => r.blob());
      
      // Create a secure hash for the filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const hashInput = `${prompt}-${timestamp}-${randomString}`;
      
      // Generate SHA-256 hash
      const encoder = new TextEncoder();
      const data = encoder.encode(hashInput);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const hashHex = Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Use first 16 characters of hash + extension for filename
      const hashedFileName = `${hashHex.substring(0, 16)}.png`;
      
      console.log(`Storing image with hashed filename: ${hashedFileName}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('token-images')
        .upload(hashedFileName, imageBlob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false, // Don't overwrite if exists (very unlikely with hash)
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // If filename collision (extremely unlikely), try with longer hash
        if (uploadError.message?.includes('already exists')) {
          const longerFileName = `${hashHex.substring(0, 24)}-${randomString}.png`;
          const { data: retryUploadData, error: retryUploadError } = await supabase.storage
            .from('token-images')
            .upload(longerFileName, imageBlob, {
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: false,
            });
          
          if (retryUploadError) {
            console.error('Retry storage upload error:', retryUploadError);
            // Return the original URL if storage fails
            return new Response(
              JSON.stringify({ imageUrl }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const { data: retryPublicUrlData } = supabase.storage
            .from('token-images')
            .getPublicUrl(longerFileName);

          return new Response(
            JSON.stringify({ imageUrl: retryPublicUrlData.publicUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Return the original URL if storage fails
        return new Response(
          JSON.stringify({ imageUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from('token-images')
        .getPublicUrl(hashedFileName);

      console.log(`Generated secure image URL: ${publicUrlData.publicUrl}`);

      return new Response(
        JSON.stringify({ imageUrl: publicUrlData.publicUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (type === 'background-removal') {
      // Handle background removal for existing images
      if (!inputImageUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing imageUrl for background removal' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log(`Processing background removal for image: ${inputImageUrl}`);

      try {
        // Download the original image
        const originalImageResponse = await fetch(inputImageUrl);
        if (!originalImageResponse.ok) {
          throw new Error('Failed to fetch original image');
        }
        const originalImageBlob = await originalImageResponse.blob();

        // Convert blob to base64 for OpenAI
        const arrayBuffer = await originalImageBlob.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // Use OpenAI's image editing API to remove background
        const editResponse = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
          },
          body: (() => {
            const formData = new FormData();
            formData.append('image', originalImageBlob, 'image.png');
            formData.append('prompt', 'Remove the background completely, keep only the main subject with transparent background');
            formData.append('n', '1');
            formData.append('size', '1024x1024');
            return formData;
          })(),
        });

        const editData = await editResponse.json();
        
        if (!editResponse.ok) {
          console.error('OpenAI Edit API error:', editData);
          throw new Error(`OpenAI Edit API error: ${editData.error?.message || 'Unknown error'}`);
        }

        const editedImageUrl = editData.data[0].url;

        // Download and store the edited image
        const editedImageBlob = await fetch(editedImageUrl).then(r => r.blob());
        
        // Create a secure hash for the filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const hashInput = `bg-removed-${inputImageUrl}-${timestamp}-${randomString}`;
        
        // Generate SHA-256 hash
        const encoder = new TextEncoder();
        const data = encoder.encode(hashInput);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);
        const hashHex = Array.from(hashArray)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        const hashedFileName = `bg-${hashHex.substring(0, 16)}.png`;
        
        console.log(`Storing background-removed image with filename: ${hashedFileName}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('token-images')
          .upload(hashedFileName, editedImageBlob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Background removal storage upload error:', uploadError);
          // Return the OpenAI URL if storage fails
          return new Response(
            JSON.stringify({ imageUrl: editedImageUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from('token-images')
          .getPublicUrl(hashedFileName);

        console.log(`Generated background-removed image URL: ${publicUrlData.publicUrl}`);

        return new Response(
          JSON.stringify({ imageUrl: publicUrlData.publicUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Background removal failed:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to remove background', details: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

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
              content: prompt.includes('Generate ticker symbols for token named:') 
                ? `Generate 5 creative ticker symbols specifically for the token named: ${prompt.replace('Generate ticker symbols for token named: ', '')}. The symbols should be 3-4 characters, relate to the token name, and be memorable. Return as JSON with array "symbols".`
                : `Generate 5 creative token names and their corresponding ticker symbols for: ${prompt}. Context: ${context || 'fun meme cryptocurrency that could go viral'}. Each name should have a matching symbol that relates to it. Return as JSON with arrays "names" and "symbols" where names[0] matches symbols[0], etc.`
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
        
        // Handle different response types
        if (prompt.includes('Generate ticker symbols for token named:')) {
          // For symbol-only requests, validate symbols array
          if (!suggestions.symbols || !Array.isArray(suggestions.symbols)) {
            throw new Error('Invalid symbols format from OpenAI');
          }
        } else {
          // For name+symbol requests, validate both arrays and ensure they match
          if (!suggestions.names || !suggestions.symbols || !Array.isArray(suggestions.names) || !Array.isArray(suggestions.symbols)) {
            throw new Error('Invalid suggestions format from OpenAI');
          }
          
          // Ensure arrays are the same length for proper pairing
          const minLength = Math.min(suggestions.names.length, suggestions.symbols.length);
          suggestions.names = suggestions.names.slice(0, minLength);
          suggestions.symbols = suggestions.symbols.slice(0, minLength);
        }
        
        return new Response(
          JSON.stringify(suggestions),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.log('Fallback: Generating random suggestions based on prompt');
        
        // Handle fallback differently based on request type
        if (prompt.includes('Generate ticker symbols for token named:')) {
          const tokenName = prompt.replace('Generate ticker symbols for token named: ', '');
          const nameUpper = tokenName.toUpperCase().replace(/\s+/g, '');
          const fallbackSymbols = [
            nameUpper.substring(0, 4),
            nameUpper.substring(0, 3) + 'X',
            nameUpper.substring(0, 3) + '1',
            nameUpper.substring(0, 2) + 'TK',
            nameUpper.substring(0, 3) + 'Z'
          ];
          
          return new Response(
            JSON.stringify({ symbols: fallbackSymbols }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Generate more varied fallback suggestions based on the prompt
          const timestamp = Date.now().toString().slice(-3);
          const themes = {
            doge: [
              { name: `SuperDoge`, symbol: 'SDGE' },
              { name: `MegaDoge`, symbol: 'MDGE' },
              { name: `DogeMoon`, symbol: 'DMOON' },
              { name: `AlphaDoge`, symbol: 'ADOG' },
              { name: `GigaDoge`, symbol: 'GDOG' }
            ],
            pepe: [
              { name: `GigaPepe`, symbol: 'GPEPE' },
              { name: `PepeMoon`, symbol: 'PMOON' },
              { name: `UltraPepe`, symbol: 'UPEPE' },
              { name: `MegaPepe`, symbol: 'MPEPE' },
              { name: `AlphaPepe`, symbol: 'APEPE' }
            ],
            moon: [
              { name: `MoonShot`, symbol: 'MOON' },
              { name: `LunarCoin`, symbol: 'LUNAR' },
              { name: `MoonForge`, symbol: 'MFRG' },
              { name: `StellarRise`, symbol: 'STAR' },
              { name: `CosmicCoin`, symbol: 'COSMIC' }
            ],
            rocket: [
              { name: `RocketFuel`, symbol: 'FUEL' },
              { name: `BlastOff`, symbol: 'BLAST' },
              { name: `ThrusterX`, symbol: 'THRX' },
              { name: `LaunchPad`, symbol: 'LAUNCH' },
              { name: `BoosterCoin`, symbol: 'BOOST' }
            ],
          };
          
          const promptLower = prompt.toLowerCase();
          let fallbackPairs = [
            { name: `ViralCoin`, symbol: 'VIRAL' },
            { name: `MemeForge`, symbol: 'MFRG' },
            { name: `PumpMaster`, symbol: 'PUMP' },
            { name: `DegenCoin`, symbol: 'DEGEN' },
            { name: `BasedToken`, symbol: 'BASED' }
          ];
          
          // Choose theme-based names if prompt matches
          for (const [theme, pairs] of Object.entries(themes)) {
            if (promptLower.includes(theme)) {
              fallbackPairs = pairs;
              break;
            }
          }
          
          const fallbackNames = fallbackPairs.map(pair => pair.name);
          const fallbackSymbols = fallbackPairs.map(pair => pair.symbol);
          
          return new Response(
            JSON.stringify({
              names: fallbackNames,
              symbols: fallbackSymbols
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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