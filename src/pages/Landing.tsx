import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import FlipCard from '../components/ui/FlipCard';

export function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Scroll animations references
  const featuresRef = useRef(null);
  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "-100px" });

  const handleCTA = () => {
    navigate('/login');
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
    <div className="min-h-screen bg-[#0C0C0E] text-[var(--text-primary)] relative overflow-hidden flex flex-col justify-between">
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
      <main className="max-w-6xl mx-auto px-6 pt-40 md:pt-48 lg:pt-56 flex-1 flex flex-col justify-center items-center text-center relative z-10">
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          className="space-y-10"
        >
          {/* Main typographics */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="font-display text-6xl md:text-8xl lg:text-[100px] xl:text-[120px] tracking-tighter leading-[0.95] flex flex-col items-center">
              <span className="font-light text-[var(--text-secondary)] select-none">
                Your notes.
              </span>
              <span className="font-medium text-white ml-6 md:ml-12 mt-1 select-none">
                Finally useful.
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.div 
            variants={itemVariants}
            className="text-base md:text-lg lg:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto font-normal leading-relaxed select-none"
          >
            Paste anything. Gemini AI builds the cards.
            <br />
            You just study. No clutter.
          </motion.div>

          {/* CTA Button */}
          <motion.div variants={itemVariants} className="pt-2">
            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 bg-[#161618] hover:bg-[#1E1E22] active:bg-black/20 text-sm font-medium px-6 py-3 rounded-lg transition-all duration-200"
            >
              <span>Start with Google</span>
              <ArrowRight size={15} />
            </button>
          </motion.div>
        </motion.div>
      </main>

      {/* Feature Demos Area (Below Fold) */}
      <section 
        ref={featuresRef}
        className="max-w-7xl mx-auto px-6 py-28 md:py-36 relative z-10 w-full"
      >
        <motion.div
          animate={isFeaturesInView ? "animate" : "initial"}
          variants={{
            initial: {},
            animate: { transition: { staggerChildren: 0.15 } }
          }}
          className="space-y-28 md:space-y-36"
        >
          {/* Section Divider */}
          <div className="h-[1px] w-full bg-white/5" />

          {/* Feature 1: The Interactive Card */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 xl:gap-32 items-center text-left"
          >
            <div className="space-y-4">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block">
                01 / SPACING ENGINE
              </span>
              <h2 className="text-3xl font-display font-medium tracking-tight">
                Active Recall, automated.
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
                Flick uses the SM-2 algorithm to dynamically schedule review dates. 
                Answer cards to set intervals: Easy cards disappear for weeks, difficult ones cycle back immediately.
              </p>
            </div>
            
            {/* Interactive Card Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[500px] bg-[#161618]/50 border border-white/5 p-5 rounded-2xl flex items-center justify-center">
                <FlipCard
                  front="How does the SM-2 algorithm schedule reviews?"
                  back="It updates review intervals by computing an Ease Factor based on your rating, widening times for easy cards and shrinking them for hard ones."
                  hint="It utilizes a recall score from 0 to 3."
                  isFlipped={false}
                  onFlip={() => {}}
                  className="h-[220px]"
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
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block">
                02 / GENERATION TOOL
              </span>
              <h2 className="text-3xl font-display font-medium tracking-tight">
                Just paste. Gemini does the rest.
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
                Feed in study sheets, URLs, or full PDF documents. Gemini 1.5 Flash generates targeted question-and-answer pairs instantly, extracting key concepts without missing critical nuances.
              </p>
            </div>

            {/* Form Mockup */}
            <div className="flex justify-center lg:justify-start">
              <div className="w-full max-w-[500px] bg-[#161618] border border-white/5 rounded-xl p-5 font-sans space-y-4 text-xs select-none">
                <div className="flex items-center gap-1 border-b border-white/5 pb-2 text-[10px] text-[var(--text-secondary)] font-mono uppercase">
                  <span className="text-purple-400 border-b border-purple-400 pb-2 px-1">Text</span>
                  <span className="px-2">PDF</span>
                  <span className="px-2">URL</span>
                </div>
                <div className="h-20 bg-[#0C0C0E] border border-white/5 rounded-lg p-3 text-[var(--text-muted)] italic text-left">
                  Paste notes here...
                </div>
                <div className="flex justify-between items-center bg-[#0C0C0E] border border-white/5 rounded-lg p-1">
                  <span className="px-3 text-[var(--text-secondary)]">Pills: 5 / 10 / 15 / 20</span>
                  <span className="bg-purple-600 px-3 py-1 rounded text-white font-medium">10 cards</span>
                </div>
                <div className="w-full bg-purple-600/10 border border-purple-500/20 text-purple-400 py-2 rounded-lg text-center font-medium font-mono text-[10px] flex items-center justify-center gap-1">
                  <Sparkles size={11} />
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
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block">
                03 / PROGRESS TRACKER
              </span>
              <h2 className="text-3xl font-display font-medium tracking-tight">
                Mastery levels at a glance.
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
                No complicated charts. Just a clear color bar showing your learning progression. Track mastered, learning, and fresh cards side by side as you study.
              </p>
            </div>
            
            {/* Calendar / Graph Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[500px] bg-[#161618] border border-white/5 p-5 rounded-xl space-y-4 text-xs font-mono select-none">
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
      <footer className="w-full border-t border-white/5 py-6 px-6 relative z-10 bg-[#0C0C0E]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-3">
            <span className="font-display font-medium text-white tracking-tight">flick</span>
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
