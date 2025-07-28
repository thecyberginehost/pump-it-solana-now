import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== MINIMAL TOKEN CREATION TEST ===");
    console.log("Request method:", req.method);
    
    if (req.method !== "POST") {
      return jsonResponse({ error: "Use POST method" }, 405);
    }

    // Parse request body
    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    console.log("Request body received:", body);

    const { name, symbol, creatorWallet } = body;
    
    if (!name || !symbol || !creatorWallet) {
      return jsonResponse({ error: "name, symbol, and creatorWallet required" }, 400);
    }

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

    // Return successful test response
    const testResponse = {
      success: true,
      message: "Minimal test function working successfully",
      token: {
        id: `test-token-${Date.now()}`,
        name,
        symbol,
        creator_wallet: creatorWallet,
        mint_address: `test-mint-${Date.now()}`,
        created_at: new Date().toISOString(),
      },
      environmentStatus: {
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey,
        heliusKey: !!heliusKey,
        platformKey: !!platformKey,
      },
      testMode: true,
      requiresSignature: false,
    };

    console.log("Returning test response:", testResponse);
    
    return jsonResponse(testResponse);

  } catch (err: any) {
    console.error("=== ERROR ===");
    console.error("Error message:", err?.message);
    console.error("Error stack:", err?.stack);
    console.error("Error name:", err?.name);
    
    return jsonResponse({
      error: err?.message ?? "Unknown error",
      errorName: err?.name,
      errorStack: err?.stack,
    }, 500);
  }
});