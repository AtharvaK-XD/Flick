# <p align="center">⚡️ Flick ⚡️</p>
<p align="center">
  <strong>Study smarter, remember forever. AI-powered flashcard generation integrated with an active spaced repetition study engine.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <br />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Google_Gemini-8E75C2?style=for-the-badge&logo=google-gemini&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 🌟 Overview

Flick is a premium, modern web application designed to turn passive reading into active, long-term recall. Simply paste your study sheets, upload a PDF, or drop an article URL. Flick’s AI engine parses the content and builds optimized Q&A flashcards instantly. 

Once generated, study your cards in a specialized active review session using the **SuperMemo SM-2 spaced repetition algorithm**—optimizing your study intervals based on how well you remember each concept.

---

## 🚀 Key Features

*   **🤖 AI Flashcard Constructor**
    *   *Text Parser*: Paste up to 15,000 characters of raw notes.
    *   *PDF Extractor*: Upload text-rich documents for immediate client-side text parsing.
    *   *URL Reader*: Input articles or Wikipedia entries (powered by Jina Reader) to extract clean context.
*   **🧠 SM-2 Spaced Repetition Engine**
    *   Tracks card Ease Factors, repetition counts, and review history.
    *   Schedules card returns dynamically: easy concepts disappear for weeks; difficult ones return immediately.
*   **📊 Gamified Progress Dashboard**
    *   Track your learning streaks and earn study XP.
    *   Visual mastery distribution bars showing **Mastered**, **Learning**, and **New** cards.
*   **🔑 API Quota Deflection Screen**
    *   Flick includes an automatic quota detection fallback. If the shared API limit is hit under high traffic, users can securely configure their own Gemini API key (saved locally) and resume card generation in real-time.
*   **🎨 Premium Dark Aesthetic**
    *   Vibrant HSL colors, smooth transitions powered by Framer Motion, and responsive layouts designed for mobile, tablet, and desktop viewports.

---

## 🛠️ Tech Stack

*   **Frontend Core**: React 19, TypeScript, Vite, TailwindCSS, Lucide Icons.
*   **Animations**: Framer Motion (for smooth flips, transitions, and hover interactions).
*   **Data Parsing**: PDF.js (CDN worker thread extraction) & Jina AI Reader API.
*   **Backend & Auth**: Supabase (Postgres Database, Auth session handlers, and Row Level Security).
*   **AI Inference**: Google Gemini 2.5 Flash API.

---

## 🔄 How It Works

```
   [ Notes / PDF / URL ]
             │
             ▼
   ┌───────────────────┐
   │  Gemini 2.5 Flash │ ──(Quota Reached)──► [ Custom API Key Prompt ]
   └─────────┬─────────┘                             │
             │                                   (Key Added)
             ▼                                       │
   ┌───────────────────┐                             │
   │  Generated Cards  │◄────────────────────────────┘
   └─────────┬─────────┘
             │
             ▼
   ┌───────────────────┐
   │   Active Review   │
   └─────────┬─────────┘
             │
      (SM-2 Algorithm)
             ▼
   [ Scheduled Intervals ]
```

---

## 📁 Repository Structure

```text
Flick/
├── frontend/             # React SPA (Vite + TS)
│   ├── src/
│   │   ├── components/   # UI Elements & features (Dashboard, Study, Generate)
│   │   ├── context/      # Card limit usage tracker and Toast alerts
│   │   ├── hooks/        # Supabase database & OAuth listeners
│   │   ├── lib/          # Gemini API integrations and routing handlers
│   │   └── pages/        # Main landing and view pages
│   ├── vercel.json       # Routing rewrites configuration for Vercel
│   └── package.json
├── backend/              # Supabase Edge Functions (Deno Deploy)
├── database/             # PostgreSQL database structures
└── package.json          # Root Monorepo configuration
```

---

## 💻 Getting Started

### 1. Installation
Clone the repository and install the workspace packages:
```bash
git clone https://github.com/yourusername/Flick.git
cd Flick
npm install
```

### 2. Configure Environment variables
Navigate to the `frontend` directory and create a `.env.local` file:
```bash
cd frontend
touch .env.local
```
Add your local API keys:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anonymous-key
VITE_GEMINI_API_KEY=your-google-gemini-key
```

### 3. Run Locally
Launch the local development server:
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## ☁️ Deployment (Vercel)

Flick is configured for seamless deployment to Vercel:

1.  Connect your repository to your **Vercel** dashboard.
2.  Set the **Root Directory** to `frontend`.
3.  Set the **Framework Preset** to **Vite**.
4.  Configure the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`).
5.  Click **Deploy**. (The SPA routes are handled automatically via [vercel.json](frontend/vercel.json)).

---
<p align="center">
  Made with ⚡️ by Atharva Kulkarni
</p>
