import { useState, useEffect } from 'react';
import type { Card } from '../../types';
import { FlipCard } from '../ui/FlipCard';
import TimerRing from '../ui/TimerRing';
import Button from '../ui/Button';
import { CheckCircle, Sparkles, ArrowLeft, Zap, Clock, Play, Download } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface StudyModeProps {
  deckTitle: string;
  cards: Card[];
  onReviewCard: (cardId: string, quality: 0 | 1 | 2 | 3) => Promise<any>;
  onFinishSession: (cardsCount: number) => Promise<void>;
  onClose: () => void;
  timerLimit?: number;
}

export function StudyMode({
  deckTitle,
  cards,
  onReviewCard,
  onFinishSession,
  onClose,
  timerLimit,
}: StudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isSavingStats, setIsSavingStats] = useState(false);
  const [intervals, setIntervals] = useState<number[]>([]);
  const [edgeGlow, setEdgeGlow] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Array<{ id: string; text: string; colorClass: string }>>([]);

  // MCQ Mode States
  const hasMcqs = cards.some(c => c.choices && Array.isArray(c.choices) && c.choices.length > 0);
  const studyStyle = hasMcqs ? 'quiz' : 'flashcard';
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showQuizHint, setShowQuizHint] = useState(false);

  // Quiz Timer & Stats States
  const [timeLeft, setTimeLeft] = useState<number>(timerLimit ? timerLimit * 60 : 0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [rightAnswers, setRightAnswers] = useState<number>(0);
  const [wrongAnswers, setWrongAnswers] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isQuizStarted, setIsQuizStarted] = useState<boolean>(true);
  const [timeExpired, setTimeExpired] = useState<boolean>(false);

  // Sync timeLeft when timerLimit changes/resolves asynchronously
  useEffect(() => {
    if (timerLimit) {
      setTimeLeft(timerLimit * 60);
    }
  }, [timerLimit]);

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;

  // Shuffle options on card load
  useEffect(() => {
    if (currentCard && currentCard.choices && Array.isArray(currentCard.choices)) {
      const copy = [...currentCard.choices];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setShuffledChoices(copy);
    } else {
      setShuffledChoices([]);
    }
    setSelectedChoice(null);
    setHasAnswered(false);
    setIsFlipped(false);
    setShowQuizHint(false);
  }, [currentIndex, currentCard]);

  const startQuiz = () => {
    if (isQuizStarted) return;
    setIsQuizStarted(true);
    setIsTimerRunning(true);
  };

  // Quiz Timer countdown/elapsed effect
  useEffect(() => {
    if (isFinished || studyStyle !== 'quiz' || !isQuizStarted) return;
    if (timerLimit && timeLeft === 0) return;

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      if (timerLimit && isTimerRunning) {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsTimerRunning(false);
            setTimeExpired(true);
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timerLimit, isTimerRunning, isFinished, studyStyle, isQuizStarted, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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

  // Keyboard controls for Flashcard ratings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (studyStyle === 'flashcard') {
          setIsFlipped((prev) => !prev);
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (isFlipped || (studyStyle === 'quiz' && hasAnswered)) {
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
  }, [isFlipped, currentIndex, isFinished, studyStyle, hasAnswered]);

  // Keyboard controls for Quiz Option Selection (A, B, C, D)
  useEffect(() => {
    const handleQuizOptionKey = (e: KeyboardEvent) => {
      if (isFinished || !currentCard || studyStyle !== 'quiz' || hasAnswered) return;

      const key = e.key.toLowerCase();
      if (key === 'a' || key === '1') {
        if (shuffledChoices[0]) handleAnswer(shuffledChoices[0]);
      } else if (key === 'b' || key === '2') {
        if (shuffledChoices[1]) handleAnswer(shuffledChoices[1]);
      } else if (key === 'c' || key === '3') {
        if (shuffledChoices[2]) handleAnswer(shuffledChoices[2]);
      } else if (key === 'd' || key === '4') {
        if (shuffledChoices[3]) handleAnswer(shuffledChoices[3]);
      }
    };

    window.addEventListener('keydown', handleQuizOptionKey);
    return () => window.removeEventListener('keydown', handleQuizOptionKey);
  }, [studyStyle, hasAnswered, shuffledChoices, isFinished, currentCard]);

  const handleAnswer = (choice: string) => {
    startQuiz();
    setSelectedChoice(choice);
    setHasAnswered(true);

    const isCorrect = choice === currentCard.back;
    if (isCorrect) {
      setRightAnswers(prev => prev + 1);
      triggerFeedback(2); // Good (+10 XP)
    } else {
      setWrongAnswers(prev => prev + 1);
      triggerFeedback(0); // Again (Review soon)
    }
  };

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
    setIsTimerRunning(false);
    
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

  const downloadResults = () => {
    const attempted = rightAnswers + wrongAnswers;
    const unattempted = cards.length - attempted;
    const accuracy = cards.length > 0 ? Math.round((rightAnswers / cards.length) * 100) : 0;
    const timeStr = `${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`;

    let md = `# Flick Quiz Results - ${deckTitle}\n\n`;
    md += `Date: ${new Date().toLocaleString()}\n`;
    md += `Time Limit Configured: ${timerLimit ? `${timerLimit} minutes` : 'None'}\n`;
    md += `Time Taken: ${timeStr}\n`;
    md += `Status: ${timeExpired ? 'Time Limit Expired' : 'Completed'}\n\n`;
    
    md += `## Score Summary\n`;
    md += `- **Right Answers**: ${rightAnswers} / ${cards.length}\n`;
    md += `- **Wrong Answers**: ${wrongAnswers} / ${cards.length}\n`;
    md += `- **Unattempted**: ${unattempted} / ${cards.length}\n`;
    md += `- **Overall Accuracy**: ${accuracy}%\n\n`;
    
    md += `## Detailed Question Report\n\n`;
    cards.forEach((card, idx) => {
      md += `### Question ${idx + 1}\n`;
      md += `**Question**: ${card.front}\n`;
      md += `**Correct Answer**: ${card.back}\n`;
      if (card.explanation) {
        md += `**Explanation**: ${card.explanation}\n`;
      }
      md += `\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `flick-quiz-${deckTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-results.md`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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



        <span className="text-xs font-mono text-[var(--text-secondary)] hidden md:inline">
          {deckTitle}
        </span>

        {timerLimit ? (
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border transition-all duration-300",
            timeLeft <= 30
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold animate-pulse"
              : "bg-purple-500/5 border-purple-500/10 text-purple-400"
          )}>
            <Clock size={13} className={cn(timeLeft <= 30 ? "text-rose-400 text-rose-500 font-bold" : "text-purple-400")} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        ) : studyStyle === 'quiz' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border bg-white/5 border-white/5 text-[var(--text-secondary)]">
            <Clock size={13} />
            <span>{formatTime(elapsedTime)}</span>
          </div>
        )}

        <span className="text-xs font-mono text-[var(--text-secondary)] bg-white/5 px-2.5 py-0.5 rounded-full font-mono">
          {isFinished ? cards.length : currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Center Study Arena */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10 overflow-y-auto">
        {!isFinished ? (
          studyStyle === 'quiz' ? (
            /* Two-Column split layout for MCQ Quiz Mode */
            <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center">
              {/* Left Column (Quiz Content - 7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4 w-full">
                <div className="w-full flex justify-center py-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentIndex}
                      initial={{ opacity: 0, x: 50, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      className="w-full flex justify-center"
                    >
                      {/* Flat card for MCQ Question */}
                      <div className="w-full rounded-3xl bg-gradient-to-br from-[#1a1a2e] via-[#16161a] to-[#0f0f14] border border-white/[0.08] relative overflow-hidden shadow-2xl p-8 min-h-[165px] flex flex-col justify-between text-left">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/[0.07] rounded-full blur-3xl pointer-events-none" />
                        <span className="text-[10px] font-mono text-purple-400/80 uppercase tracking-[0.18em] block">
                          Question
                        </span>
                        <div className="flex-1 flex items-center justify-center py-4">
                          <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] text-center leading-relaxed select-none">
                            {currentCard.front}
                          </h2>
                        </div>
                        {currentCard.hint && !hasAnswered && (
                          <div className="text-center mt-2 border-t border-white/5 pt-2">
                            <button
                              onClick={() => setShowQuizHint(h => !h)}
                              className="text-[10px] font-mono text-[var(--text-secondary)] hover:text-purple-400 underline transition-colors cursor-pointer bg-transparent border-none outline-none"
                            >
                              {showQuizHint ? "Hide Hint" : "Need a Hint?"}
                            </button>
                            {showQuizHint && (
                              <motion.p
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xs text-purple-300/80 italic mt-1.5"
                              >
                                {currentCard.hint}
                              </motion.p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* MCQ Quiz Options Grid */}
                {shuffledChoices.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-2">
                    {shuffledChoices.map((choice, idx) => {
                      const isCorrect = choice === currentCard.back;
                      const isSelected = selectedChoice === choice;
                      let btnStyle = "bg-surface border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/[0.03]";
                      
                      if (hasAnswered) {
                        if (isCorrect) {
                          btnStyle = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                        } else if (isSelected) {
                          btnStyle = "bg-rose-500/10 border-rose-500/40 text-rose-400 font-semibold shadow-[0_0_15px_rgba(244,63,94,0.15)]";
                        }
                      } else if (isSelected) {
                        btnStyle = "bg-purple-500/10 border-purple-500/40 text-purple-400 border-purple-500/50";
                      }
                      
                      return (
                        <button
                          key={idx}
                          disabled={hasAnswered}
                          onClick={() => handleAnswer(choice)}
                          className={cn(
                            "w-full text-left px-5 py-4 rounded-xl border text-sm transition-all duration-300 active:scale-[0.98] cursor-pointer",
                            btnStyle
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border transition-all duration-300",
                              hasAnswered && isCorrect ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                              : hasAnswered && isSelected ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                              : "bg-white/5 border-white/10 text-[var(--text-secondary)]"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1 leading-snug">{choice}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* MCQ Quiz Mode Explanation */}
                {hasAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full mt-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5 text-left"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-widest block">
                        Answer &amp; Explanation
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-emerald-400">
                        Correct: {currentCard.back}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                      {currentCard.explanation || "No additional explanation provided."}
                    </p>
                    {currentCard.hint && (
                      <p className="text-xs text-[var(--text-muted)] italic font-mono mt-1 pt-1 border-t border-white/5">
                        Hint was: {currentCard.hint}
                      </p>
                    )}
                  </motion.div>
                )}

                {!hasAnswered && (
                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-2 text-center">
                    Select an option above (or press [A - D] / [1 - 4])
                  </p>
                )}

                {hasAnswered && (
                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-2 text-center">
                    Press [1 - 4] to adjust rating &amp; advance
                  </p>
                )}
              </div>

              {/* Right Column (Persistent Countdown Ring - 5 cols) */}
              <div className="lg:col-span-5 w-full flex flex-col items-center justify-center">
                <div className="w-full rounded-3xl bg-[#161618] border border-white/5 p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                  
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--text-secondary)] mb-6">
                    {timerLimit ? "Active Quiz Timer" : "Quiz Elapsed Time"}
                  </h3>

                  <TimerRing
                    timeLeft={timerLimit ? timeLeft : elapsedTime}
                    totalDuration={timerLimit ? timerLimit * 60 : elapsedTime}
                    isCountingUp={!timerLimit}
                    label={!isQuizStarted ? "Ready" : timerLimit ? "Remaining" : "Elapsed"}
                  />

                  {!isQuizStarted ? (
                    <div className="mt-6 w-full space-y-3">
                      <p className="text-[11px] text-[var(--text-muted)] font-mono max-w-[240px] mx-auto leading-relaxed">
                        The timer is currently paused. Click below or choose an option on the left to start.
                      </p>
                      <button
                        type="button"
                        onClick={startQuiz}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-purple-600 border border-purple-500 hover:bg-purple-500 hover:border-purple-400 text-white transition-all duration-200 active:scale-[0.97] cursor-pointer shadow-lg shadow-purple-500/20"
                      >
                        <Play size={14} className="fill-white text-white" />
                        <span>Start Quiz Timer</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 w-full space-y-3">
                      <p className="text-[11px] text-[var(--text-muted)] font-mono max-w-[240px] mx-auto leading-relaxed">
                        Timer is active. Select options on the left to complete your quiz.
                      </p>
                      <button
                        type="button"
                        onClick={handleSessionComplete}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all duration-200 active:scale-[0.97] cursor-pointer"
                      >
                        <span>End Quiz &amp; View Report</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Standard Flashcard Layout */
            <div className="w-full flex flex-col items-center gap-4 overflow-hidden max-w-[620px] mx-auto">
              <div className="w-full flex justify-center py-1">
                <FlipCard
                  front={currentCard.front}
                  back={currentCard.back}
                  hint={currentCard.hint}
                  isFlipped={isFlipped}
                  onFlip={() => {
                    setIsFlipped(!isFlipped);
                  }}
                />
              </div>

              {/* Ratings details/labels */}
              {!isFlipped && (
                <p className="text-xs text-[var(--text-secondary)] font-mono animate-pulse mt-2">
                  Press [Space] or click card to flip
                </p>
              )}

              {isFlipped && (
                <div className="text-xs text-[var(--text-secondary)] font-mono mt-2">
                  Press [1 - 4] on your keyboard to rate
                </div>
              )}
            </div>
          )
        ) : (
          /* Completion Screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center space-y-6 bg-surface border border-[var(--border)] rounded-xl p-8 shadow-2xl"
          >
            {studyStyle === 'quiz' ? (
              /* MCQ Performance Report */
              <>
                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
                  <CheckCircle size={24} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
                    {timeExpired ? "⏳ Time's Up! Quiz ended." : "🎉 Quiz Completed!"}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Here is how you performed in this multiple-choice quiz session.
                  </p>
                </div>

                <div className="bg-[#131315] border border-white/5 rounded-2xl p-5 space-y-4 text-left">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <span className="text-[8px] text-emerald-400/70 font-mono uppercase tracking-wider block mb-0.5">Right</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">{rightAnswers}</span>
                    </div>
                    <div className="text-center p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10">
                      <span className="text-[8px] text-rose-400/70 font-mono uppercase tracking-wider block mb-0.5">Wrong</span>
                      <span className="text-lg font-bold text-rose-400 font-mono">{wrongAnswers}</span>
                    </div>
                    <div className="text-center p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <span className="text-[8px] text-amber-400/70 font-mono uppercase tracking-wider block mb-0.5">Unattempt</span>
                      <span className="text-lg font-bold text-amber-400 font-mono">{cards.length - (rightAnswers + wrongAnswers)}</span>
                    </div>
                    <div className="text-center p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/10">
                      <span className="text-[8px] text-purple-400/70 font-mono uppercase tracking-wider block mb-0.5">Time</span>
                      <span className="text-xs font-bold text-purple-400 font-mono block mt-1">
                        {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-[var(--text-secondary)]">Accuracy Score</span>
                      <span className="text-purple-400 font-semibold">{Math.round((rightAnswers / cards.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" 
                        style={{ width: `${(rightAnswers / cards.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {timeExpired && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-mono text-center uppercase tracking-wider">
                      ⚠️ Session auto-submitted due to time limit expiration.
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Standard Flashcard Screen */
              <>
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
              </>
            )}

            <div className="flex flex-col gap-2.5 w-full">
              {studyStyle === 'quiz' && (
                <button
                  type="button"
                  onClick={downloadResults}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-purple-600 border border-purple-500 hover:bg-purple-500 hover:border-purple-400 text-white transition-all duration-200 active:scale-[0.97] cursor-pointer shadow-lg shadow-purple-500/10"
                >
                  <Download size={14} />
                  <span>Download Quiz Results</span>
                </button>
              )}
              <Button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-1.5"
                loading={isSavingStats}
              >
                <Sparkles size={14} />
                <span>Return to Dashboard</span>
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="px-6 py-6 border-t border-[var(--border)] flex flex-col items-center bg-app min-h-[96px] justify-center relative z-10">
        <AnimatePresence mode="wait">
          {!isFinished && (isFlipped || (studyStyle === 'quiz' && hasAnswered)) ? (
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
                className={cn(
                  "flex flex-col items-center justify-center py-2.5 rounded-lg border text-purple-400 transition-all duration-300 active:scale-[0.96] cursor-pointer",
                  studyStyle === 'quiz' && selectedChoice === currentCard.back
                    ? "border-purple-500 bg-purple-500/20 shadow-[0_0_12px_rgba(124,58,237,0.2)]"
                    : "border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/40"
                )}
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
              {studyStyle === 'flashcard' ? (
                <Button
                  onClick={() => setIsFlipped(true)}
                  className="w-full py-3 text-sm font-semibold"
                >
                  Reveal Answer
                </Button>
              ) : (
                <div className="w-full py-3 text-center text-xs font-mono text-[var(--text-secondary)] border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                  Select an option above to answer &amp; flip card
                </div>
              )}
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
