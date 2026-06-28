import { useRef } from 'react';

import { motion, useInView } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import FlipCard from '../components/ui/FlipCard';

export function Landing() {
  const { signInWithGoogle } = useAuth();

  // Scroll animations references
  const featuresRef = useRef(null);
  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "-100px" });

  const handleCTA = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    }
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 1, 0.5, 1] as [number, number, number, number] } },
  };

  return (
    <div className="min-h-screen bg-app text-[var(--text-primary)] relative overflow-hidden flex flex-col justify-between">
      {/* Slow radial glow animation background */}
      <div 
        className="absolute top-[35vh] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] max-w-[800px] h-[50vh] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none select-none"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)',
          animation: 'glowPulse 3s cubic-bezier(0.16, 1, 0.3, 1) 1 forwards',
        }}
      />
      
      {/* Styles for pulse animation */}
      <style>{`
        @keyframes glowPulse {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          30% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.05); }
          100% { opacity: 0.25; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      {/* Main Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-48 md:pt-56 lg:pt-64 pb-16 flex-1 flex flex-col justify-center items-center text-center relative z-10">
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="space-y-12"
        >
          {/* Main typographics */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="font-display text-7xl md:text-[100px] lg:text-[115px] xl:text-[135px] tracking-tighter leading-[0.95] flex flex-col items-center">
              <span className="font-light text-[var(--text-secondary)] select-none">
                Your notes.
              </span>
              <span className="font-medium text-white mt-2 select-none">
                Finally useful.
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.div 
            variants={itemVariants}
            className="text-lg md:text-xl lg:text-2xl text-[var(--text-secondary)] max-w-3xl mx-auto font-normal leading-relaxed select-none"
          >
            Paste anything. Gemini AI builds the cards.
            <br />
            You just study. No clutter.
          </motion.div>

          {/* CTA Button */}
          <motion.div variants={itemVariants} className="pt-2">
            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-4 border border-[var(--border)] hover:border-[var(--border-hover)] bg-surface hover:bg-surface-2 active:scale-[0.97] text-base font-semibold px-8 py-4 rounded-xl transition-all duration-200 cursor-pointer shadow-md"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Login with Google</span>
              <ArrowRight size={16} className="opacity-70 ml-1" />
            </button>
          </motion.div>
        </motion.div>
      </main>

      {/* Feature Demos Area (Below Fold) */}
      <section 
        ref={featuresRef}
        className="max-w-7xl mx-auto px-6 py-36 md:py-48 relative z-10 w-full"
      >
        <motion.div
          animate={isFeaturesInView ? "animate" : "initial"}
          variants={{
            initial: {},
            animate: { transition: { staggerChildren: 0.15 } }
          }}
          className="space-y-36 md:space-y-48"
        >
          {/* Section Divider */}
          <div className="h-[1px] w-full bg-white/5" />

          {/* Feature 1: The Interactive Card */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 xl:gap-32 items-center text-left"
          >
            <div className="space-y-4">
              <span className="text-xs font-semibold font-mono text-purple-400 uppercase tracking-widest block">
                01 / SPACING ENGINE
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-white">
                Active Recall, automated.
              </h2>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed max-w-md">
                Flick uses the SM-2 algorithm to dynamically schedule review dates. 
                Answer cards to set intervals: Easy cards disappear for weeks, difficult ones cycle back immediately.
              </p>
            </div>
            
            {/* Interactive Card Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[560px] bg-surface/50 border border-[var(--border)] p-6 rounded-2xl flex items-center justify-center shadow-lg">
                <FlipCard
                  front="How does the SM-2 algorithm schedule reviews?"
                  back="It updates review intervals by computing an Ease Factor based on your rating, widening times for easy cards and shrinking them for hard ones."
                  hint="It utilizes a recall score from 0 to 3."
                  isFlipped={false}
                  onFlip={() => {}}
                  className="h-[240px] max-w-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Feature 2: Generator Demo */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 xl:gap-32 items-center text-left"
          >
            <div className="lg:order-2 space-y-4">
              <span className="text-xs font-semibold font-mono text-purple-400 uppercase tracking-widest block">
                02 / GENERATION TOOL
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-white">
                Just paste. Gemini does the rest.
              </h2>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed max-w-md">
                Feed in study sheets, URLs, or full PDF documents. Gemini 1.5 Flash generates targeted question-and-answer pairs instantly, extracting key concepts without missing critical nuances.
              </p>
            </div>

            {/* Form Mockup */}
            <div className="flex justify-center lg:justify-start">
              <div className="w-full max-w-[560px] bg-surface border border-[var(--border)] rounded-xl p-6 font-sans space-y-5 text-sm select-none shadow-lg">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-[10px] text-[var(--text-secondary)] font-mono uppercase">
                  <span className="text-purple-400 border-b border-purple-400 pb-2 px-1">Text</span>
                  <span className="px-2">PDF</span>
                  <span className="px-2">URL</span>
                </div>
                <div className="h-24 bg-app border border-[var(--border)] rounded-lg p-3.5 text-[var(--text-muted)] italic text-left">
                  Paste notes here...
                </div>
                <div className="flex justify-between items-center bg-app border border-[var(--border)] rounded-lg p-1.5">
                  <span className="px-3 text-[var(--text-secondary)] text-xs">Pills: 5 / 10 / 15 / 20</span>
                  <span className="bg-purple-600 px-3 py-1 rounded text-white font-medium text-xs">10 cards</span>
                </div>
                <div className="w-full bg-purple-600/10 border border-purple-500/20 text-purple-400 py-2.5 rounded-lg text-center font-medium font-mono text-[10px] flex items-center justify-center gap-1.5">
                  <Sparkles size={12} />
                  <span>Generate flashcards</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature 3: Spacing visualization */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 xl:gap-32 items-center text-left"
          >
            <div className="space-y-4">
              <span className="text-xs font-semibold font-mono text-purple-400 uppercase tracking-widest block font-bold">
                03 / PROGRESS TRACKER
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-white">
                Mastery levels at a glance.
              </h2>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed max-w-md">
                No complicated charts. Just a clear color bar showing your learning progression. Track mastered, learning, and fresh cards side by side as you study.
              </p>
            </div>
            
            {/* Calendar / Graph Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[560px] bg-surface border border-[var(--border)] p-6 rounded-xl space-y-4 text-xs font-mono select-none shadow-lg">
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                  <span>MASTERY OVERVIEW</span>
                  <span className="text-purple-400">76%</span>
                </div>
                
                {/* Horizontal progress visualization */}
                <div className="h-2 w-full flex rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[60%]" title="Mastered" />
                  <div className="h-full bg-amber-500 w-[25%]" title="Learning" />
                  <div className="h-full bg-white/10 w-[15%]" title="New" />
                </div>
                
                <div className="flex justify-between items-center text-[9px] text-[var(--text-muted)] border-t border-white/5 pt-3">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Mastered (6)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Learning (3)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                    <span>New (1)</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer Area */}
      <footer className="w-full border-t border-[var(--border)] py-6 px-6 relative z-10 bg-app">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-3">
            <span className="font-display font-medium text-white tracking-tight">Flick</span>
            <span className="text-[var(--text-muted)]">|</span>
            <span>Study smarter, remember forever.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Terms</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
