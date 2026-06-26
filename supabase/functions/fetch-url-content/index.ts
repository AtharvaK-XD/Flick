import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();

    if (!url) return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Jina AI Reader — free, no API key, returns clean markdown
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: { "Accept": "text/plain" },
    });

    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`);

    const content = await response.text();

    return new Response(JSON.stringify({ content: content.slice(0, 20000) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
