import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { content, count = 10 } = await req.json();

    if (!content || content.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Content too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a flashcard generator. Given the content below, generate exactly ${count} high-quality flashcards.

Rules:
- Each flashcard must have a clear, specific question on the front
- The answer on the back should be concise but complete (1-2 sentences max)
- The "explanation" should be a concise, helpful explanation (2-4 sentences max) that expands on the answer with key context
- Include a one-sentence hint that gives a nudge without giving away the answer
- Questions should test understanding, not just memorization of exact phrases
- Do not generate duplicate or overly similar cards
- Return ONLY valid JSON, no markdown, no explanation, no backticks

Return this exact JSON structure:
{
  "cards": [
    { "front": "question here", "back": "answer here", "explanation": "explanation here", "hint": "hint here" }
  ]
}

Content to process:
${content.slice(0, 15000)}`;

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.4, 
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        },
      }),
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

    const geminiData = await response.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (parsed && Array.isArray(parsed.cards)) {
      let resultCards = parsed.cards;
      if (resultCards.length > count) {
        resultCards = resultCards.slice(0, count);
      } else if (resultCards.length < count && resultCards.length > 0) {
        const originalLength = resultCards.length;
        while (resultCards.length < count) {
          resultCards = resultCards.concat(resultCards.slice(0, originalLength).map((c: any) => ({
            ...c,
            front: `${c.front} (Recall Practice)`
          })));
        }
        resultCards = resultCards.slice(0, count);
      }
      parsed.cards = resultCards;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
