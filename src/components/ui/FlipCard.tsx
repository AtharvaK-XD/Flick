import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { HelpCircle } from 'lucide-react';

interface FlipCardProps {
  front: string;
  back: string;
  hint?: string | null;
  isFlipped: boolean;
  onFlip: () => void;
  className?: string;
}

export function FlipCard({
  front,
  back,
  hint,
  isFlipped,
  onFlip,
  className,
}: FlipCardProps) {
  const [showHint, setShowHint] = useState(false);

  const handleFlipClick = (e: React.MouseEvent) => {
    // Avoid flipping when clicking the hint button
    const target = e.target as HTMLElement;
    if (target.closest('.hint-btn')) return;
    
    onFlip();
    setShowHint(false); // Reset hint on flip
  };

  return (
    <div 
      className={cn(
        "w-full max-w-[500px] h-[320px] md:max-w-[620px] md:h-[380px] lg:max-w-[700px] lg:h-[420px] cursor-pointer perspective-1200", 
        className
      )}
      onClick={handleFlipClick}
    >
      <div
        className={cn(
          "w-full h-full duration-500 preserve-3d relative rounded-2xl transition-transform border border-white/5",
          isFlipped ? "rotate-y-180" : ""
        )}
        style={{
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Front Side */}
        <div className="absolute inset-0 w-full h-full rounded-2xl bg-[#161618] p-8 flex flex-col justify-between backface-hidden border border-white/5">
          <div className="flex justify-between items-center text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">
            <span>Question</span>
            {hint && (
              <button
                type="button"
                className="hint-btn flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(!showHint);
                }}
              >
                <HelpCircle size={13} />
                <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
              </button>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            {showHint ? (
              <div className="animate-fade-up text-sm italic text-purple-400 max-w-[80%]">
                {hint}
              </div>
            ) : (
              <h2 className="text-xl md:text-2xl font-medium tracking-tight text-[var(--text-primary)] select-none">
                {front}
              </h2>
            )}
          </div>
          
          <div className="text-center text-xs text-[var(--text-muted)] select-none">
            Tap to reveal answer
          </div>
        </div>

        {/* Back Side */}
        <div className="absolute inset-0 w-full h-full rounded-2xl bg-[#1E1E22] p-8 flex flex-col justify-between backface-hidden rotate-y-180 border border-white/5">
          <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">
            Answer
          </div>
          
          <div className="flex-1 flex justify-center items-center text-center">
            <p className="text-base md:text-lg leading-relaxed text-[var(--text-primary)] font-normal select-none">
              {back}
            </p>
          </div>
          
          <div className="text-center text-xs text-[var(--text-muted)] select-none">
            How well did you remember?
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlipCard;
