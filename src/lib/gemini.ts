import { isDemoMode } from './supabase';

interface GeneratedCard {
  front: string;
  back: string;
  hint: string;
}

export interface GenerationResult {
  cards: GeneratedCard[];
  title?: string;
}

/**
 * Generates flashcards from a text block.
 * 
 * In normal mode, this calls the Supabase Edge Function.
 * In demo mode, it uses the custom API key if provided, or runs the local mock generator.
 */
export async function generateCards(
  content: string,
  count: number = 10,
  customApiKey?: string
): Promise<GenerationResult> {
  const parsedCount = Number(count) || 10;

  // 1. User-provided Gemini API Key (takes priority, great for testing/local key settings)
  if (customApiKey) {
    const prompt = `You are a flashcard generator. Given the content below, generate exactly ${parsedCount} high-quality flashcards.

Rules:
- Each flashcard must have a clear, specific question on the front
- The answer on the back should be concise but complete (1-3 sentences max)
- Include a one-sentence hint that gives a nudge without giving away the answer
- Questions should test understanding, not just memorization of exact phrases
- Do not generate duplicate or overly similar cards
- Return ONLY valid JSON, no markdown, no explanation, no backticks

Return this exact JSON structure:
{
  "cards": [
    { "front": "question here", "back": "answer here", "hint": "hint here" }
  ]
}

Content to process:
${content.slice(0, 15000)}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${customApiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
      }),
    });

    if (!response.ok) {
      let details = response.statusText;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          details = errJson.error.message || JSON.stringify(errJson.error);
        }
      } catch (e) {
        try {
          const text = await response.text();
          if (text) details = text.slice(0, 150);
        } catch (_) {}
      }
      throw new Error(`Gemini API error: ${details} (${response.status})`);
    }

    const geminiData = await response.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    
    // Strip markdown formatting if any
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
  }

  // 2. Normal mode (Supabase connected)
  if (!isDemoMode) {
    // Extract supabase URL from env
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    
    // Retrieve supabase session token if user is logged in
    const storageKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    let token = '';
    if (storageKey) {
      try {
        const sessionStr = localStorage.getItem(storageKey);
        if (sessionStr) {
          const parsed = JSON.parse(sessionStr);
          token = parsed.access_token || '';
        }
      } catch (e) {
        console.error('Error parsing Supabase token', e);
      }
    }
    
    // Call Supabase Edge Function 'generate-cards'
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ content, count: parsedCount }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMessage = `Server error: ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        errMessage = errJson.error || errMessage;
      } catch (e) {}
      throw new Error(errMessage);
    }

    return response.json();
  }

  // 3. Demo mode local mock engine
  await new Promise((resolve) => setTimeout(resolve, 2000)); // simulate API latency
  const textLower = content.toLowerCase();
  let cards: GeneratedCard[] = [];

  if (textLower.includes('react') || textLower.includes('vite') || textLower.includes('component')) {
    cards = [
      {
        front: "What is Vite?",
        back: "Vite is a modern frontend build tool that is extremely fast. It uses native ES modules in the browser for instant HMR (Hot Module Replacement) during development.",
        hint: "It means 'quick' in French."
      },
      {
        front: "What is React 18's Concurrent Mode?",
        back: "Concurrent Mode is a set of new features in React 18 that allows React to prepare multiple versions of your UI at the same time, improving rendering performance and responsiveness.",
        hint: "It allows React to interrupt a render to handle a user interaction."
      },
      {
        front: "What is the purpose of React's useEffect hook?",
        back: "The useEffect hook allows you to perform side effects in functional components, such as data fetching, subscriptions, or manually changing the DOM.",
        hint: "It runs after the component renders."
      },
      {
        front: "What is Virtual DOM in React?",
        back: "The Virtual DOM is a lightweight programming concept where an ideal, or 'virtual', representation of a UI is kept in memory and synced with the real DOM by a library such as ReactDOM.",
        hint: "It enables efficient rendering updates via reconciliation."
      },
      {
        front: "What are React Server Components (RSC)?",
        back: "React Server Components are components designed to run on the server, allowing developers to build UIs that span the server and client, reducing bundle size and improving load speed.",
        hint: "They render on the server and send serialized JSON UI structures, not HTML."
      }
    ];
  } else if (textLower.includes('spaced repetition') || textLower.includes('sm-2') || textLower.includes('forgetting') || textLower.includes('algorithm')) {
    cards = [
      {
        front: "What is the SM-2 algorithm?",
        back: "SM-2 is a spaced repetition algorithm developed by Piotr Wozniak. It calculates review intervals for flashcards based on how easily they are recalled by the user.",
        hint: "It is the core algorithm used in SuperMemo-2 and Anki."
      },
      {
        front: "How does Ease Factor work in SM-2?",
        back: "The Ease Factor determines how quickly the review interval increases for a card. Easier cards have a higher Ease Factor, meaning they are shown less frequently over time.",
        hint: "It starts at 2.5 and goes up or down based on review grades."
      },
      {
        front: "What happens to the interval of a card when a user answers 'Again' (quality 0)?",
        back: "When a card is rated 0 (Again), the repetition count is reset, and the next review interval is reset to 1 day to ensure immediate re-study.",
        hint: "The card is scheduled for tomorrow."
      },
      {
        front: "What is Spaced Repetition?",
        back: "Spaced Repetition is a learning technique where information is reviewed at increasing intervals over time to exploit the psychological spacing effect and prevent forgetting.",
        hint: "It counters the forgetting curve."
      },
      {
        front: "What is the forgetting curve?",
        back: "The forgetting curve hypothesizes the decline of memory retention in time. It shows how information is lost over time when there is no attempt to retain it.",
        hint: "Formulated by Hermann Ebbinghaus."
      }
    ];
  } else {
    // Generic sentence parsing mock builder
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 250);

    if (sentences.length >= 2) {
      for (let i = 0; i < Math.min(parsedCount, sentences.length); i++) {
        const sentence = sentences[i];
        const words = sentence.split(/\s+/);
        if (words.length > 6) {
          const targetIndex = Math.floor(words.length / 2);
          const targetWord = words[targetIndex].replace(/[,.;:()'"\-\[\]]/g, '');
          if (targetWord.length > 3) {
            words[targetIndex] = "_______";
            const front = `Complete this statement: "${words.join(' ')}"`;
            const back = `The missing word is: "${targetWord}". Full sentence: "${sentence}"`;
            const hint = `The missing word starts with the letter "${targetWord[0].toUpperCase()}".`;
            cards.push({ front, back, hint });
          }
        }
      }
    }

    if (cards.length === 0) {
      cards = [
        {
          front: "What is the main subject of your pasted text?",
          back: `The text focuses on: "${content.slice(0, 100)}...". Flashcards are automatically generated from this raw note.`,
          hint: "Examine the beginning of your text."
        },
        {
          front: "Why is active recall important in cognitive learning?",
          back: "Active recall forces the brain to retrieve information from memory, strengthening neural pathways and improving long-term retention compared to passive reading.",
          hint: "It is the opposite of passively skimming notes."
        },
        {
          front: "How does the Flick app assist with learning?",
          back: "Flick uses Google Gemini AI to analyze raw study content and instantly structure it into Q&A flashcards integrated with a spaced repetition system.",
          hint: "It turns passive text into active recall cards."
        }
      ];
    }
  }

  // Adjust/repeat cards if we need more to match count
  let resultCards = [...cards];
  while (resultCards.length < parsedCount) {
    resultCards = resultCards.concat(cards.map(c => ({
      ...c,
      front: c.front + " (Recall Practice)"
    })));
  }

  return {
    cards: resultCards.slice(0, parsedCount),
    title: inferTitle(content)
  };
}

/**
 * Infers a clean 5-6 word title from the content.
 */
export function inferTitle(content: string): string {
  const cleanText = content.replace(/[#*`[\]()]/g, '').trim();
  const words = cleanText.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return "Untitled Deck";
  
  const sliceWords = words.slice(0, 5);
  const inferred = sliceWords.join(' ');
  // Capitalize first letter of each word
  return inferred.replace(/\b\w/g, c => c.toUpperCase());
}
