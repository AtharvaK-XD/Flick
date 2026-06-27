import { isDemoMode } from './supabase';

interface GeneratedCard {
  front: string;
  back: string;
  hint: string;
  explanation: string;
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
  let lastError: any = null;
  
  // Decide which API key to use for client-side generation
  // 1. User-provided custom API key from settings takes priority
  // 2. Build-time environment variable VITE_GEMINI_API_KEY as general fallback
  const activeApiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY;

  if (activeApiKey) {
    const prompt = `You are a flashcard generator. Given the content below, generate exactly ${parsedCount} high-quality flashcards.

Rules:
- Each flashcard must have a clear, specific question on the front
- The "back" should be a SHORT, concise answer (1-2 sentences max) — this is what appears on the card itself
- The "explanation" should be a concise, helpful explanation (2-4 sentences max) that expands on the answer with key context — this is shown separately as a study aid
- Include a one-sentence hint that gives a nudge without giving away the answer
- Questions should test understanding, not just memorization of exact phrases
- Do not generate duplicate or overly similar cards
- Return ONLY valid JSON, no markdown, no explanation, no backticks

Return this exact JSON structure:
{
  "cards": [
    { "front": "question here", "back": "short answer here", "explanation": "detailed multi-sentence explanation with context and examples here", "hint": "hint here" }
  ]
}

Content to process:
${content.slice(0, 15000)}`;

    // Use gemini-2.5-flash which is compatible with all key formats (including newer AQ. keys)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeApiKey}`;
    
    try {
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.4, 
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          },
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
    } catch (clientErr: any) {
      console.warn("Client-side generation failed:", clientErr);
      lastError = clientErr;
    }
  }

  // 2. Normal mode (Supabase connected)
  if (!isDemoMode) {
    try {
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

      if (response.ok) {
        return await response.json();
      }

      const errText = await response.text();
      let errMessage = `Server error: ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        errMessage = errJson.error || errMessage;
      } catch (e) {}
      throw new Error(errMessage);
    } catch (supabaseErr: any) {
      console.warn("Supabase Edge function failed:", supabaseErr);
      lastError = supabaseErr || lastError;
    }
  }

  // If there was an error and credentials were set, throw it so the user knows it failed.
  if (lastError && (activeApiKey || !isDemoMode)) {
    throw new Error(lastError.message || String(lastError));
  }

  // 3. Demo mode local mock engine / fallback
  console.info("Falling back to local mock generator engine");
  const textLower = content.toLowerCase();
  let cards: GeneratedCard[] = [];

  if (textLower.includes('react') || textLower.includes('vite') || textLower.includes('component')) {
    cards = [
      {
        front: "What is Vite?",
        back: "Vite is a modern frontend build tool that provides extremely fast HMR using native ES modules.",
        explanation: "Vite is a next-generation frontend build tool created by Evan You (creator of Vue.js). Unlike traditional bundlers like Webpack that bundle all files upfront, Vite leverages native ES module imports in the browser during development, meaning it only processes files on-demand. This results in near-instant server starts and lightning-fast Hot Module Replacement (HMR). For production builds, Vite uses Rollup under the hood for optimized bundling.",
        hint: "It means 'quick' in French."
      },
      {
        front: "What is React 18's Concurrent Mode?",
        back: "Concurrent Mode allows React to prepare multiple versions of the UI simultaneously, improving responsiveness.",
        explanation: "React 18's Concurrent Mode is a fundamental shift in how React renders components. Previously, rendering was synchronous and blocking — once React started rendering, it couldn't be interrupted. With Concurrent Mode, React can pause, resume, or abandon renders based on priority. This enables features like Suspense, useTransition, and useDeferredValue. The key benefit is that high-priority updates (like user input) can interrupt low-priority renders (like data loading), making the UI feel much more responsive even under heavy load.",
        hint: "It allows React to interrupt a render to handle a user interaction."
      },
      {
        front: "What is the purpose of React's useEffect hook?",
        back: "useEffect lets you perform side effects in functional components after rendering.",
        explanation: "The useEffect hook is React's mechanism for synchronizing a component with external systems. It runs after every render by default, but you can control when it fires using a dependency array. An empty array [] means it runs only once on mount. It replaces the lifecycle methods componentDidMount, componentDidUpdate, and componentWillUnmount from class components. Common use cases include: fetching data from an API, setting up event listeners, managing subscriptions, and directly manipulating the DOM. You can return a cleanup function to avoid memory leaks.",
        hint: "It runs after the component renders."
      },
      {
        front: "What is Virtual DOM in React?",
        back: "The Virtual DOM is an in-memory representation of the UI that React syncs with the real DOM efficiently.",
        explanation: "The Virtual DOM (VDOM) is a programming concept where React maintains a lightweight copy of the actual DOM in memory as a JavaScript object tree. When state or props change, React creates a new VDOM tree and compares it with the previous one through a process called 'reconciliation' using a diffing algorithm. Only the parts of the real DOM that actually changed are updated — a process called 'patching'. This is far more efficient than directly manipulating the DOM for every change, as DOM operations are expensive. Libraries like ReactDOM handle the syncing between the VDOM and real DOM.",
        hint: "It enables efficient rendering updates via reconciliation."
      },
      {
        front: "What are React Server Components (RSC)?",
        back: "RSCs are components that render entirely on the server, reducing client bundle size.",
        explanation: "React Server Components (RSC) represent a major architectural shift introduced in React 18+. Unlike traditional React components that run in the browser, RSCs execute only on the server and send serialized UI (not HTML) to the client. They have direct access to server-side resources like databases and file systems without exposing credentials to the client. RSCs cannot use hooks (useState, useEffect) or browser APIs. The main benefits are: significantly smaller JavaScript bundles, faster initial page loads, zero-latency data access, and better SEO. They work alongside Client Components (marked with 'use client') in a hybrid architecture.",
        hint: "They render on the server and send serialized JSON UI structures, not HTML."
      }
    ];
  } else if (textLower.includes('spaced repetition') || textLower.includes('sm-2') || textLower.includes('forgetting') || textLower.includes('algorithm')) {
    cards = [
      {
        front: "What is the SM-2 algorithm?",
        back: "SM-2 is a spaced repetition algorithm that calculates review intervals based on recall ease.",
        explanation: "The SM-2 (SuperMemo 2) algorithm was developed by Polish researcher Piotr Wozniak in 1987. It is the foundation of modern spaced repetition software like Anki. The algorithm works by tracking an 'Ease Factor' (EF) for each card, starting at 2.5. After each review, the user grades their recall from 0–5. The next review interval is calculated as: I(n) = I(n-1) × EF. Cards answered poorly get shorter intervals, while easy cards have rapidly increasing intervals (1 day → 6 days → 2 weeks → months). This exploits the 'spacing effect' — the cognitive phenomenon where memories are stronger when study sessions are spread out over time.",
        hint: "It is the core algorithm used in SuperMemo-2 and Anki."
      },
      {
        front: "How does Ease Factor work in SM-2?",
        back: "The Ease Factor controls how quickly review intervals grow — higher means shown less frequently.",
        explanation: "The Ease Factor (EF) in SM-2 is a multiplier between 1.3 and 2.5 that determines how aggressively the review interval increases for a given card. It starts at 2.5 for all new cards. After each review, it's adjusted based on quality of recall: quality ratings of 3+ increase or maintain the EF, while ratings below 3 decrease it. The formula is: EF = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02)) where q is the quality score 0–5. A card with EF 2.5 will see its interval multiplied by 2.5 each successful review, while a difficult card with EF 1.3 only multiplies by 1.3, keeping it in frequent rotation.",
        hint: "It starts at 2.5 and goes up or down based on review grades."
      },
      {
        front: "What is Spaced Repetition?",
        back: "Spaced Repetition is a learning technique that schedules reviews at increasing intervals to maximize retention.",
        explanation: "Spaced Repetition (SR) is a scientifically validated learning technique based on the 'spacing effect' — the observation that information is better retained when study sessions are distributed over time rather than massed together (cramming). The technique works by scheduling reviews just before you're about to forget something, reinforcing the memory trace at the optimal moment. Research shows SR can reduce study time by up to 90% while achieving the same or better retention compared to massed practice. It's particularly effective for large bodies of factual knowledge like vocabulary, medical terminology, historical dates, and programming concepts.",
        hint: "It counters the forgetting curve."
      },
      {
        front: "What is the forgetting curve?",
        back: "The forgetting curve shows how memory retention declines exponentially over time without review.",
        explanation: "The forgetting curve was described by German psychologist Hermann Ebbinghaus in the 1880s through self-experimentation. He memorized lists of nonsense syllables and tested his retention at various intervals, discovering that memory decays exponentially — roughly 50% of information is forgotten within an hour, 70% within a day, and nearly all within a week without reinforcement. The curve is described by the formula: R = e^(-t/S), where R is memory retention, t is time, and S is the stability of the memory. Crucially, each successful review makes the memory more stable, flattening the curve and extending how long the memory persists before the next review is needed.",
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
            const explanation = `This card asks you to recall a specific keyword from the sentence to reinforce active recall. Context: "${sentence}"`;
            cards.push({ front, back, hint, explanation });
          }
        }
      }
    }

    if (cards.length === 0) {
      cards = [
        {
          front: "What is the main subject of your pasted text?",
          back: `The text focuses on: "${content.slice(0, 100)}...". Flashcards are automatically generated from this raw note.`,
          explanation: `This fallback card is generated based on the introductory context of your input text: "${content.slice(0, 250)}...". Reading context-focused summaries aids general comprehension before details are drilled.`,
          hint: "Examine the beginning of your text."
        },
        {
          front: "Why is active recall important in cognitive learning?",
          back: "Active recall forces the brain to retrieve information from memory, strengthening neural pathways and improving long-term retention compared to passive reading.",
          explanation: "Active recall is the cognitive process of actively retrieving information from memory without looking at the source. Research shows that forcing the brain to retrieve a memory traces stronger neural pathways, transforming short-term comprehension into permanent knowledge far more efficiently than re-reading notes.",
          hint: "It is the opposite of passively skimming notes."
        },
        {
          front: "How does the Flick app assist with learning?",
          back: "Flick uses Google Gemini AI to analyze raw study content and instantly structure it into Q&A flashcards integrated with a spaced repetition system.",
          explanation: "Flick automates the creation of study aids by parsing user notes using Deno Edge functions backed by Google Gemini. The generated cards are integrated with an active spacing engine that leverages the SuperMemo SM-2 algorithm to optimize study intervals based on individual card recall scores.",
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
