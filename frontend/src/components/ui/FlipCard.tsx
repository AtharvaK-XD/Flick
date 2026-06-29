import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { HelpCircle, Volume2 } from 'lucide-react';

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsLang, setTtsLang] = useState<'en' | 'hi'>(() => {
    return (localStorage.getItem('flick_tts_lang') as 'en' | 'hi') || 'en';
  });

  const handleFlipClick = (e: React.MouseEvent) => {
    // Avoid flipping when clicking the hint or voice buttons
    const target = e.target as HTMLElement;
    if (target.closest('.hint-btn')) return;
    
    onFlip();
    setShowHint(false); // Reset hint on flip
  };

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation(); // Avoid card flip

    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/[#*`[\]()_]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Web Speech API voices
    const voices = window.speechSynthesis.getVoices();
    
    let voice = null;
    if (ttsLang === 'hi') {
      voice = voices.find(v => v.lang.startsWith('hi') || v.lang.toLowerCase().includes('hindi'));
      utterance.lang = 'hi-IN';
    } else {
      voice = voices.find(v => v.lang.startsWith('en') || v.lang.toLowerCase().includes('english') || v.name.toLowerCase().includes('google'));
      utterance.lang = 'en-US';
    }
    
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleLanguage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLang = ttsLang === 'en' ? 'hi' : 'en';
    setTtsLang(newLang);
    localStorage.setItem('flick_tts_lang', newLang);
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync state if voices finish speaking
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const interval = setInterval(() => {
      if (isSpeaking && !window.speechSynthesis.speaking) {
        setIsSpeaking(false);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  return (
    <div 
      className={cn(
        "w-full max-w-[500px] h-[320px] md:max-w-[620px] md:h-[380px] lg:max-w-[700px] lg:h-[420px] cursor-pointer perspective-1200 hover:scale-[1.012] transition-all duration-300 ease-out", 
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
        <div className="absolute inset-0 w-full h-full rounded-2xl bg-surface p-8 flex flex-col justify-between backface-hidden border border-[var(--border)]">
          <div className="flex justify-between items-center text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <span>Question</span>
              {/* Voice toggle and trigger buttons */}
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5 ml-2">
                <button
                  type="button"
                  title={isSpeaking ? "Stop speaking" : "Speak question"}
                  className="hint-btn p-1 rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  onClick={(e) => handleSpeak(e, front)}
                >
                  <Volume2 size={13} className={cn(isSpeaking ? "animate-pulse text-purple-400" : "")} />
                </button>
                <button
                  type="button"
                  title="Switch pronunciation language (English / Hindi)"
                  className="hint-btn px-1.5 py-0.5 rounded hover:bg-white/10 text-[9px] font-bold text-purple-400 hover:text-purple-300 transition-colors tracking-tight font-sans"
                  onClick={toggleLanguage}
                >
                  {ttsLang === 'en' ? 'EN' : 'HI'}
                </button>
              </div>
            </div>
            
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
        <div className="absolute inset-0 w-full h-full rounded-2xl bg-surface-2 p-8 flex flex-col justify-between backface-hidden rotate-y-180 border border-[var(--border)]">
          <div className="flex justify-between items-center text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <span>Answer</span>
              {/* Voice toggle and trigger buttons */}
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5 ml-2">
                <button
                  type="button"
                  title={isSpeaking ? "Stop speaking" : "Speak answer"}
                  className="hint-btn p-1 rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  onClick={(e) => handleSpeak(e, back)}
                >
                  <Volume2 size={13} className={cn(isSpeaking ? "animate-pulse text-emerald-400" : "")} />
                </button>
                <button
                  type="button"
                  title="Switch pronunciation language (English / Hindi)"
                  className="hint-btn px-1.5 py-0.5 rounded hover:bg-white/10 text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors tracking-tight font-sans"
                  onClick={toggleLanguage}
                >
                  {ttsLang === 'en' ? 'EN' : 'HI'}
                </button>
              </div>
            </div>
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
