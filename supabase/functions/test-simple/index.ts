import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== SIMPLE TEST FUNCTION START ===");
    console.log("Request method:", req.method);
    
    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    const platformKey = Deno.env.get("PLATFORM_WALLET_PRIVATE_KEY");
    
    console.log("Environment check:");
    console.log("- SUPABASE_URL:", supabaseUrl ? "✅ Present" : "❌ Missing");
    console.log("- SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "✅ Present" : "❌ Missing");
    console.log("- HELIUS_RPC_API_KEY:", heliusKey ? "✅ Present" : "❌ Missing");
    console.log("- PLATFORM_WALLET_PRIVATE_KEY:", platformKey ? "✅ Present" : "❌ Missing");
    
    return new Response(JSON.stringify({
      success: true,
      message: "Test function working",
      environmentCheck: {
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey,
        heliusKey: !!heliusKey,
        platformKey: !!platformKey
      }
    }), {
      status: 200,
      headers: corsHeaders,
    });
    
  } catch (err: any) {
    console.error("=== ERROR ===");
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
    
    return new Response(JSON.stringify({
      error: err.message,
      stack: err.stack
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});