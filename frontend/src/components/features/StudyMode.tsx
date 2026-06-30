import { useState, useEffect } from 'react';
import type { Card } from '../../types';
import { FlipCard } from '../ui/FlipCard';
import Button from '../ui/Button';
import { CheckCircle, Sparkles, ArrowLeft, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

interface StudyModeProps {
  deckTitle: string;
  cards: Card[];
  onReviewCard: (cardId: string, quality: 0 | 1 | 2 | 3) => Promise<any>;
  onFinishSession: (cardsCount: number) => Promise<void>;
  onClose: () => void;
}

export function StudyMode({
  deckTitle,
  cards,
  onReviewCard,
  onFinishSession,
  onClose,
}: StudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSavingStats, setIsSavingStats] = useState(false);
  const [intervals, setIntervals] = useState<number[]>([]);
  const [edgeGlow, setEdgeGlow] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Array<{ id: string; text: string; colorClass: string }>>([]);

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;

  const triggerFeedback = (quality: 0 | 1 | 2 | 3) => {
    const qualities = [
      { text: 'Again (Review soon)', colorClass: 'text-rose-400 border-rose-500/20 bg-rose-950/80' },
      { text: 'Hard (Keep practicing)', colorClass: 'text-amber-400 border-amber-500/20 bg-amber-950/80' },
      { text: 'Good! (+10 XP)', colorClass: 'text-purple-400 border-purple-500/20 bg-purple-950/80' },
      { text: 'Easy! (+15 XP)', colorClass: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/80' },
    ];
    const { text, colorClass } = qualities[quality];
    const id = Math.random().toString(36).substring(2, 9);
    
    setFeedbacks((prev) => [...prev, { id, text, colorClass }]);
    setTimeout(() => {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    }, 1000);

    const edgeGlows = ['glow-red', 'glow-yellow', 'glow-purple', 'glow-green'];
    setEdgeGlow(edgeGlows[quality]);
    setTimeout(() => {
      setEdgeGlow(null);
    }, 600);
  };

  // Keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (isFlipped) {
        // Rating keys: 1, 2, 3, 4
        if (e.key === '1') {
          handleRate(0);
        } else if (e.key === '2') {
          handleRate(1);
        } else if (e.key === '3') {
          handleRate(2);
        } else if (e.key === '4') {
          handleRate(3);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, isFinished]);

  const handleRate = async (quality: 0 | 1 | 2 | 3) => {
    if (!currentCard) return;

    triggerFeedback(quality);

    try {
      const updatedCard = await onReviewCard(currentCard.id, quality);
      if (updatedCard) {
        setIntervals((prev) => [...prev, updatedCard.interval_days]);
      }
    } catch (e) {
      console.error('Error saving review:', e);
    }

    setReviewedCount((prev) => prev + 1);

    // Check if there's a next card
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Finished all cards!
      handleSessionComplete();
    }
  };

  const handleSessionComplete = async () => {
    setIsFinished(true);
    
    // Confetti Burst!
    confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#7C3AED', '#A78BFA', '#10B981', '#F43F5E']
    });

    setIsSavingStats(true);
    try {
      await onFinishSession(cards.length);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingStats(false);
    }
  };

  // Calculate average next interval for display
  const getAverageInterval = () => {
    if (intervals.length === 0) return 3;
    const sum = intervals.reduce((a, b) => a + b, 0);
    return Math.round(sum / intervals.length);
  };

  if (cards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-app flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">No cards to study in this mode.</p>
          <Button onClick={onClose} variant="secondary">
            Back to deck
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-app flex flex-col justify-between text-left select-none overflow-hidden">
      {/* Edge glows on rating */}
      <div className={cn("study-edge-glow absolute inset-0 pointer-events-none z-[60] transition-all duration-300", edgeGlow)} />

      {/* Floating feedback XP bubble list */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col gap-2.5 items-center">
        <AnimatePresence>
          {feedbacks.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 40, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.85, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className={cn("px-5 py-2.5 rounded-full border text-xs font-semibold shadow-2xl backdrop-blur-md font-mono tracking-wider", f.colorClass)}
            >
              {f.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Session Progress Line Indicator at the absolute top */}
      <div className="h-[2px] w-full bg-white/5 absolute top-0 left-0">
        <div 
          className="h-full bg-purple-500 transition-all duration-300"
          style={{ width: isFinished ? '100%' : `${progressPercent}%` }}
        />
      </div>

      {/* Top Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 relative z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Leave study mode</span>
        </button>

        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {deckTitle}
        </span>

        <span className="text-xs font-mono text-[var(--text-secondary)] bg-white/5 px-2.5 py-0.5 rounded-full">
          {isFinished ? cards.length : currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Center Study Arena */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
        {!isFinished ? (
          <div className="w-full flex flex-col items-center gap-6 overflow-hidden">
            <div className="w-full flex justify-center py-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 50, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  className="w-full flex justify-center"
                >
                  <FlipCard
                    front={currentCard.front}
                    back={currentCard.back}
                    hint={currentCard.hint}
                    isFlipped={isFlipped}
                    onFlip={() => setIsFlipped(!isFlipped)}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {!isFlipped ? (
              <p className="text-xs text-[var(--text-secondary)] font-mono animate-pulse mt-2">
                Press [Space] or click card to flip
              </p>
            ) : (
              <div className="text-xs text-[var(--text-secondary)] font-mono mt-2">
                Press [1 - 4] on your keyboard to rate
              </div>
            )}
          </div>
        ) : (
          /* Completion Screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center space-y-6 bg-surface border border-[var(--border)] rounded-xl p-8 shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
              <CheckCircle size={24} />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
                Deck study completed!
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Awesome work. The SM-2 algorithm has updated your recall intervals. 
                {intervals.length > 0 && ` Your average card interval is now ${getAverageInterval()} days.`}
              </p>
            </div>

            <div className="bg-app border border-[var(--border)] rounded-lg p-4 grid grid-cols-2 gap-4">
              <div className="text-left">
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">
                  Reviewed
                </span>
                <span className="text-lg font-semibold text-[var(--text-primary)]">
                  {reviewedCount} cards
                </span>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">
                  Awarded
                </span>
                <span className="text-lg font-semibold text-purple-400 flex items-center gap-1">
                  +{reviewedCount * 10} XP <Zap size={14} className="fill-purple-400 text-purple-400" />
                </span>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-1.5"
              loading={isSavingStats}
            >
              <Sparkles size={14} />
              <span>Return to Dashboard</span>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="px-6 py-6 border-t border-[var(--border)] flex flex-col items-center bg-app min-h-[96px] justify-center relative z-10">
        <AnimatePresence mode="wait">
          {!isFinished && isFlipped ? (
            <motion.div 
              key="rating-buttons"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-[500px] md:max-w-[620px] lg:max-w-[700px] grid grid-cols-4 gap-3"
            >
              {/* Again Button */}
              <button
                onClick={() => handleRate(0)}
                className="flex flex-col items-center justify-center py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40 text-red-400 transition-all duration-300 active:scale-[0.96] cursor-pointer"
              >
                <span className="text-xs font-semibold">Again</span>
                <span className="text-[10px] font-mono text-red-400/60 mt-0.5">[1]</span>
              </button>

              {/* Hard Button */}
              <button
                onClick={() => handleRate(1)}
                className="flex flex-col items-center justify-center py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 text-amber-400 transition-all duration-300 active:scale-[0.96] cursor-pointer"
              >
                <span className="text-xs font-semibold">Hard</span>
                <span className="text-[10px] font-mono text-amber-400/60 mt-0.5">[2]</span>
              </button>

              {/* Good Button */}
              <button
                onClick={() => handleRate(2)}
                className="flex flex-col items-center justify-center py-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/40 text-purple-400 transition-all duration-300 active:scale-[0.96] cursor-pointer"
              >
                <span className="text-xs font-semibold">Good</span>
                <span className="text-[10px] font-mono text-purple-400/60 mt-0.5">[3]</span>
              </button>

              {/* Easy Button */}
              <button
                onClick={() => handleRate(3)}
                className="flex flex-col items-center justify-center py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-emerald-400 transition-all duration-300 active:scale-[0.96] cursor-pointer"
              >
                <span className="text-xs font-semibold">Easy</span>
                <span className="text-[10px] font-mono text-emerald-400/60 mt-0.5">[4]</span>
              </button>
            </motion.div>
          ) : !isFinished ? (
            <motion.div
              key="reveal-button"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-[500px] md:max-w-[620px] lg:max-w-[700px]"
            >
              <Button
                onClick={() => setIsFlipped(true)}
                className="w-full py-3 text-sm font-semibold"
              >
                Reveal Answer
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="finished-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] font-mono text-[var(--text-muted)]"
            >
              Powered by Flick Spaced Repetition (SM-2)
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default StudyMode;
    </div>
  );
}

export default StudyMode;
