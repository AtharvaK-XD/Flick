# Flick ⚡️

> Study smarter, remember forever. AI-powered flashcard generation integrated with a spaced repetition study engine.

Flick is a premium web application designed to turn passive reading into active recall practice. Simply paste your notes, upload a PDF, or provide a URL, and Flick's Google Gemini-powered engine will instantly generate high-quality question-and-answer flashcards. Study them using the built-in active spacing engine backed by the SuperMemo SM-2 algorithm.

---

## ✨ Key Features

*   **🤖 AI-Powered Generation**: Instantly build decks from raw text, uploaded PDF documents (client-side parsing), or URL articles (via Jina Reader).
*   **🧠 SM-2 Spaced Repetition Algorithm**: Calculates next review intervals based on how well you remember each card (incorporating Ease Factors, repetitions, and real-time scheduling).
*   **📊 Mastery Overview Dashboard**: Visualize your study streaks, total XP earned, and mastery progression ratios (Mastered vs. Learning vs. New cards) at a glance.
*   **🔑 Custom API Key Settings & Quota Deflection**: In case the shared API limit is reached, Flick includes a custom fallback screen to configure your own Gemini API key (saved locally in your browser memory) and automatically retries generation in real-time.
*   **⚡️ Premium UI/UX**: Built with a sleek dark mode layout, micro-interactions powered by Framer Motion, and a fully responsive grid.

---

## 🛠️ Tech Stack

*   **Frontend**: React 19 (TypeScript), Vite, TailwindCSS, Framer Motion, Lucide Icons, PDF.js (CDN worker text extraction).
*   **Backend & Database**: Supabase (Auth, Postgres DB, Row Level Security policies).
*   **AI Models**: Google Gemini 2.5 Flash API (via direct client-side fetch or Supabase Edge Functions fallback).

---

## 📁 Repository Structure

```text
Flick/
├── frontend/             # React SPA (Vite, TS, TailwindCSS)
│   ├── src/
│   │   ├── components/   # UI components & features (Generate, Study, Dashboard)
│   │   ├── context/      # Global state (CardUsage, Toast)
│   │   ├── hooks/        # Supabase and OAuth custom hooks
│   │   ├── lib/          # Gemini API integration & helper utilities
│   │   └── pages/        # Dashboard, Settings, Study, and Landing pages
│   ├── vercel.json       # SPA routing configuration for Vercel
│   └── package.json
├── backend/              # Supabase Edge Functions (Deno)
│   └── functions/
│       ├── generate-cards/
│       └── fetch-url-content/
├── database/             # Postgres database schema
│   └── schema.sql
└── package.json          # Root monorepo configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
*   Node.js (v18+ recommended)
*   A free [Supabase](https://supabase.com) account
*   A free [Google Gemini API Key](https://aistudio.google.com)

### 2. Local Setup
1.  Clone this repository and navigate to the project folder.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Navigate to the `frontend` folder and create a `.env.local` file:
    ```bash
    cd frontend
    # Create .env.local file
    ```
4.  Add your credentials to `frontend/.env.local`:
    ```env
    VITE_SUPABASE_URL=your-supabase-project-url
    VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
    VITE_GEMINI_API_KEY=your-gemini-api-key
    ```
5.  Start the development server:
    ```bash
    npm run dev
    ```

---

## ☁️ Deployment (Vercel)

1.  Connect your GitHub repository to **Vercel**.
2.  Set the **Root Directory** to `frontend`.
3.  Set the **Framework Preset** to **Vite**.
4.  Add your environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_GEMINI_API_KEY`) to the Vercel project settings.
5.  Deploy! (The [vercel.json](frontend/vercel.json) file will automatically handle routing redirects).
