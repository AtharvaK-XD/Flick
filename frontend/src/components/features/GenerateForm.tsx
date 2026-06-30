import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Link2, FileText, X, Sparkles, Check, ArrowLeft, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, HelpCircle, RotateCcw, Key, Volume2, Clock } from 'lucide-react';
import { generateCards, inferTitle } from '../../lib/gemini';
import Button from '../ui/Button';
import Loader from '../ui/Loader';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';
import { useCardUsage } from '../../context/CardUsageContext';
import TimerRing from '../ui/TimerRing';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDFJS CDN Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.370'}/build/pdf.worker.min.mjs`;

interface GenerateFormProps {
  onSaveDeck: (title: string, sourceType: 'text' | 'pdf' | 'url', sourcePreview: string, cards: any[], timerLimit?: number) => Promise<any>;
  onPhaseChange?: (isReview: boolean) => void;
}

export function GenerateForm({ onSaveDeck, onPhaseChange }: GenerateFormProps) {
  const { toast } = useToast();
  const { cardsUsed, limit, percentageLeft, refreshUsage, resetTime, recordGeneration } = useCardUsage();
  
  // Phase: 'input' | 'review'
  const [phase, setPhase] = useState<'input' | 'review'>('input');
  
  // Tabs: 'text' | 'pdf' | 'url'
  const [activeTab, setActiveTab] = useState<'text' | 'pdf' | 'url'>('pdf');
  
  // Title & Card Count
  const [title, setTitle] = useState('');
  const [cardCount, setCardCount] = useState<number>(10);
  const [generationMode, setGenerationMode] = useState<'flashcard' | 'mcq'>('flashcard');
  
  // Inputs
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generatedCards, setGeneratedCards] = useState<Array<{ front: string; back: string; hint: string; explanation: string; choices?: string[] }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [lastContent, setLastContent] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');

  // Helper to identify models with 15 card limit
  const isModelLimited = (modelId: string) => {
    return modelId === 'llama-3.1-8b-instant';
  };

  // Adjust card count if model changes to a limited model
  useEffect(() => {
    if (cardCount === 20 && isModelLimited(selectedModel)) {
      setCardCount(15);
      toast('Selected model supports a maximum of 15 cards. Count adjusted.', 'info');
    }
  }, [selectedModel, cardCount, toast]);

  // Review phase states
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [cardResults, setCardResults] = useState<Map<number, 'right' | 'wrong'>>(new Map());
  const [reviewSelections, setReviewSelections] = useState<Map<number, string>>(new Map());
  const [timerLimit, setTimerLimit] = useState(15);

  // Drag and Drop State
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Card ref for layout (no tilt — removing 3D tilt prevents hover lag)
  const reviewCardRef = useRef<HTMLDivElement>(null);

  // Text-To-Speech States & Handlers
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsLang, setTtsLang] = useState<'en' | 'hi'>(() => {
    return (localStorage.getItem('flick_tts_lang') as 'en' | 'hi') || 'en';
  });

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();

    if (!('speechSynthesis' in window)) {
      toast("Text-to-speech is not supported in this browser.", "error");
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

  // Cancel speech on unmount or phase change
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [phase]);


  // Handle PDF text extraction
  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setPdfFile(file);
        setIsExtractingPdf(true);
        setGenerationStep('Extracting PDF text...');
        try {
          const extracted = await extractPdfText(file);
          setPdfText(extracted);
          toast(`Successfully read PDF: ${file.name}`, 'success');
        } catch (err) {
          console.error(err);
          toast('Failed to read PDF text. Try another PDF.', 'error');
          setPdfFile(null);
        } finally {
          setIsExtractingPdf(false);
          setGenerationStep('');
        }
      } else {
        toast('Please upload only PDF files.', 'error');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFile(file);
      setIsExtractingPdf(true);
      setGenerationStep('Extracting PDF text...');
      try {
        const extracted = await extractPdfText(file);
        setPdfText(extracted);
        toast(`Successfully read PDF: ${file.name}`, 'success');
      } catch (err) {
        console.error(err);
        toast('Failed to read PDF text. Try another PDF.', 'error');
        setPdfFile(null);
      } finally {
        setIsExtractingPdf(false);
        setGenerationStep('');
      }
    }
  };

  const clearPdf = () => {
    setPdfFile(null);
    setPdfText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Run Generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check flashcard limit
    if (cardsUsed >= limit) {
      let resetMsg = 'Please try again in 12 hours.';
      if (resetTime) {
        const diffMs = new Date(resetTime).getTime() - Date.now();
        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          resetMsg = `Please try again after ${hours}h ${minutes}m.`;
        }
      }
      toast(`You have reached the limit of 100 generated flashcards. ${resetMsg}`, 'error');
      return;
    }
    if (cardsUsed + cardCount > limit) {
      let resetMsg = 'Please wait for your limit to reset or request fewer cards.';
      if (resetTime) {
        const diffMs = new Date(resetTime).getTime() - Date.now();
        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          resetMsg = `Your limit will begin to reset in ${hours}h ${minutes}m.`;
        }
      }
      toast(`You only have ${limit - cardsUsed} cards remaining in your 12-hour limit, but requested ${cardCount}. ${resetMsg}`, 'error');
      return;
    }

    let contentToProcess = '';
    
    if (activeTab === 'text') {
      if (!textInput.trim() || textInput.trim().length < 50) {
        toast('Please paste at least 50 characters of content.', 'error');
        return;
      }
      contentToProcess = textInput;
    } else if (activeTab === 'pdf') {
      if (!pdfText || pdfText.trim().length < 50) {
        toast('The extracted PDF text is too short or empty (less than 50 characters). Please upload a text-rich PDF.', 'error');
        return;
      }
      contentToProcess = pdfText;
    } else if (activeTab === 'url') {
      if (!urlInput.trim() || !urlInput.startsWith('http')) {
        toast('Please enter a valid HTTP/HTTPS URL.', 'error');
        return;
      }
      setGenerationStep('Reading URL content...');
      setIsGenerating(true);
      try {
        const jinaUrl = `https://r.jina.ai/${urlInput.trim()}`;
        const response = await fetch(jinaUrl, { headers: { 'Accept': 'text/plain' } });
        if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`);
        contentToProcess = await response.text();
      } catch (err: any) {
        console.error(err);
        toast(`Failed to load URL content: ${err.message}`, 'error');
        setIsGenerating(false);
        return;
      }
    }

    setLastContent(contentToProcess);
    await triggerGenerate(contentToProcess);
  };

  const triggerGenerate = async (contentToProcess: string) => {
    setIsGenerating(true);
    setGeneratedCards([]);

    try {
      const isGroq = !selectedModel.startsWith('gemini-');
      setGenerationStep(isGroq ? 'Asking Groq AI...' : 'Asking Gemini AI...');
      
      const customKey = isGroq
        ? (localStorage.getItem('flick_custom_groq_key') || undefined)
        : (localStorage.getItem('flick_custom_gemini_key') || undefined);
        
      setGenerationStep(generationMode === 'mcq' ? 'Building MCQs...' : 'Building cards...');
      const result = await generateCards(contentToProcess, cardCount, customKey, selectedModel, generationMode);
      
      if (result.cards && result.cards.length > 0) {
        recordGeneration(result.cards.length);
        setGeneratedCards(result.cards);
        if (!title.trim()) {
          const inferred = result.title || inferTitle(contentToProcess);
          setTitle(inferred);
        }
        // Switch to review phase
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setShowHint(false);
        setCardResults(new Map());
        setReviewSelections(new Map());
        setPhase('review');
        onPhaseChange?.(true);
        toast(`Generated ${result.cards.length} cards!`, 'success');
      } else {
        throw new Error('AI returned 0 cards. Please try different content.');
      }
    } catch (err: any) {
      console.error(err);
      
      const errMsg = err.message || String(err);
      const isQuotaError = 
        errMsg.toLowerCase().includes('quota') || 
        errMsg.includes('429') || 
        errMsg.toLowerCase().includes('rate limit');
        
      if (isQuotaError) {
        setIsQuotaExceeded(true);
        const isGroq = !selectedModel.startsWith('gemini-');
        toast(`${isGroq ? 'Groq' : 'Gemini'} API quota reached. Please configure a custom key to continue.`, 'error');
      } else {
        toast(errMsg || 'Failed to generate cards.', 'error');
      }
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleSaveQuotaKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempApiKey.trim()) {
      toast('Please enter a valid API key.', 'error');
      return;
    }
    
    const isGroq = !selectedModel.startsWith('gemini-');
    const storageKey = isGroq ? 'flick_custom_groq_key' : 'flick_custom_gemini_key';
    
    localStorage.setItem(storageKey, tempApiKey.trim());
    setIsQuotaExceeded(false);
    toast('API Key saved successfully! Retrying card generation...', 'success');
    
    // Retrigger generation with preserved content
    await triggerGenerate(lastContent);
  };

  const handleSave = async () => {
    if (generatedCards.length === 0) return;
    setIsSaving(true);
    const finalTitle = title.trim() || 'New Deck';
    const sourceType = activeTab;
    let sourcePreview = '';
    if (activeTab === 'text') sourcePreview = textInput.slice(0, 200);
    else if (activeTab === 'pdf') sourcePreview = pdfFile ? pdfFile.name : 'Uploaded PDF';
    else sourcePreview = urlInput;

    try {
      await onSaveDeck(finalTitle, sourceType, sourcePreview, generatedCards, timerLimit);
      await refreshUsage();
      toast('Deck saved successfully!', 'success');
      // Reset to input phase
      setPhase('input');
      onPhaseChange?.(false);
      setGeneratedCards([]);
      setCardResults(new Map());
    } catch (err: any) {
      toast(err.message || 'Failed to save deck.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToInput = () => {
    setPhase('input');
    onPhaseChange?.(false);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  // Navigation
  const goNext = useCallback(() => {
    if (currentCardIndex < generatedCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  }, [currentCardIndex, generatedCards.length]);

  const goPrev = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  }, [currentCardIndex]);

  const markCard = useCallback((result: 'right' | 'wrong') => {
    setCardResults(prev => {
      const next = new Map(prev);
      next.set(currentCardIndex, result);
      return next;
    });
    // Auto-advance to next card after marking
    if (currentCardIndex < generatedCards.length - 1) {
      setTimeout(() => {
        setCurrentCardIndex(prev => prev + 1);
        setIsFlipped(false);
        setShowHint(false);
      }, 300);
    }
  }, [currentCardIndex, generatedCards.length]);

  const currentCard = generatedCards[currentCardIndex];
  const rightCount = [...cardResults.values()].filter(v => v === 'right').length;
  const wrongCount = [...cardResults.values()].filter(v => v === 'wrong').length;

  // Keyboard shortcuts for review phase
  useEffect(() => {
    if (phase !== 'review' || !currentCard) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if ((e.key === ' ' || e.key === 'Enter') && !currentCard.choices) {
        e.preventDefault();
        setIsFlipped(f => !f);
        setShowHint(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, goNext, goPrev, currentCard]);

  // (3D tilt removed — was causing hover lag on flashcard click)

  const tabOptions = [
    { id: 'pdf', label: 'PDF', icon: Upload },
    { id: 'url', label: 'URL', icon: Link2 },
    { id: 'text', label: 'Text', icon: FileText },
  ] as const;

  // ═══════════════════════════════════════════
  // REVIEW PHASE
  // ═══════════════════════════════════════════
  if (phase === 'review' && currentCard) {
    return (
      <div className="w-full flex flex-col gap-4">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToInput}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to upload</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-emerald-400 flex items-center gap-1"><ThumbsUp size={12} /> {rightCount}</span>
              <span className="text-rose-400 flex items-center gap-1"><ThumbsDown size={12} /> {wrongCount}</span>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {currentCardIndex + 1} / {generatedCards.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
            initial={false}
            animate={{ width: `${((currentCardIndex + 1) / generatedCards.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* ── Two-Column Split ── */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* LEFT: Question + Choices + Navigation Controls */}
          <div className={cn("flex flex-col gap-5 w-full", !currentCard.choices && "order-2 lg:order-1")}>
            <p className="text-[10px] font-mono text-purple-400/70 uppercase tracking-[0.15em]">
              {title || 'Untitled Deck'} · Card {currentCardIndex + 1}
            </p>

            <div className="space-y-2">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">Question</span>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] leading-snug">
                {currentCard.front}
              </h2>
            </div>

            {currentCard.choices ? (
              /* Dedicated Interactive MCQ Option List for Review */
              <div className="grid grid-cols-1 gap-2.5 mt-2">
                {currentCard.choices.map((choice, idx) => {
                  const isCorrect = choice === currentCard.back;
                  const choiceSelected = reviewSelections.get(currentCardIndex);
                  const hasAnswered = !!choiceSelected;
                  const isSelected = choiceSelected === choice;

                  let btnStyle = "bg-white/[0.02] border-white/5 text-[var(--text-secondary)] hover:bg-white/[0.05]";
                  if (hasAnswered) {
                    if (isCorrect) {
                      btnStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.1)]";
                    } else if (isSelected) {
                      btnStyle = "bg-rose-500/10 border-rose-500/30 text-rose-400 font-semibold shadow-[0_0_12px_rgba(244,63,94,0.1)]";
                    } else {
                      btnStyle = "bg-white/[0.01] border-white/5 text-[var(--text-secondary)] opacity-40";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={hasAnswered}
                      onClick={() => {
                        setReviewSelections(prev => new Map(prev).set(currentCardIndex, choice));
                        markCard(isCorrect ? 'right' : 'wrong');
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all duration-200 cursor-pointer active:scale-[0.98]",
                        btnStyle
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono border",
                          hasAnswered && isCorrect ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                          : hasAnswered && isSelected ? "bg-rose-500/20 border-rose-500/30 text-rose-400"
                          : "bg-white/5 border-white/10 text-[var(--text-muted)]"
                        )}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1 leading-snug">{choice}</span>
                        {hasAnswered && isCorrect && (
                          <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Correct Answer
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="h-px bg-white/5" />

            {/* Explanation panel (only for standard flashcards, since MCQs have it on the right) */}
            {!currentCard.choices && (
              <AnimatePresence mode="wait">
                {isFlipped ? (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-widest">Answer / Explanation</span>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">{currentCard.explanation || currentCard.back}</p>
                    {currentCard.hint && (
                      <div className="mt-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                        <p className="text-[10px] font-mono text-purple-400/70 uppercase tracking-widest mb-1">Hint</p>
                        <p className="text-xs text-purple-300/80 leading-relaxed italic">{currentCard.hint}</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="prompt"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Click the card on the right — or press{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[var(--text-muted)]">Space</kbd>
                      {' '}— to flip it and reveal the full answer &amp; explanation here.
                    </p>
                    {currentCard.hint && (
                      <button
                        onClick={() => setShowHint(s => !s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs font-mono border border-white/5"
                      >
                        <HelpCircle size={13} />
                        <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                      </button>
                    )}
                    {showHint && currentCard.hint && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10"
                      >
                        <p className="text-xs text-purple-300/80 leading-relaxed italic">{currentCard.hint}</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Controls */}
            <div className="flex flex-col gap-3 pt-2">
              {/* Wrong / Right self-marking (only for standard flashcards, since MCQs have it on the right) */}
              {!currentCard.choices && (
                <div className="flex gap-3">
                  <button
                    onClick={() => markCard('wrong')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.97]",
                      cardResults.get(currentCardIndex) === 'wrong'
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-white/[0.03] text-[var(--text-secondary)] border border-white/5 hover:border-rose-500/20 hover:text-rose-400 hover:bg-rose-500/5"
                    )}
                  >
                    <ThumbsDown size={15} /><span>Wrong</span>
                  </button>
                  <button
                    onClick={() => markCard('right')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.97]",
                      cardResults.get(currentCardIndex) === 'right'
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/[0.03] text-[var(--text-secondary)] border border-white/5 hover:border-emerald-500/20 hover:text-emerald-400 hover:bg-emerald-500/5"
                    )}
                  >
                    <ThumbsUp size={15} /><span>Right</span>
                  </button>
                </div>
              )}

              {/* Prev / Dots / Next */}
              <div className="flex items-center justify-between">
                <button
                  onClick={goPrev}
                  disabled={currentCardIndex === 0}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all border",
                    currentCardIndex === 0
                      ? "text-[var(--text-muted)] cursor-not-allowed opacity-40 border-transparent"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border-white/5 active:scale-[0.97]"
                  )}
                >
                  <ChevronLeft size={15} /><span>Previous</span>
                </button>
                <div className="flex gap-1.5">
                  {generatedCards.map((_, idx) => {
                    const result = cardResults.get(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => { setCurrentCardIndex(idx); setIsFlipped(false); setShowHint(false); }}
                        className={cn(
                          "h-2 rounded-full transition-all duration-200",
                          idx === currentCardIndex ? "w-5 bg-purple-500"
                          : result === 'right' ? "w-2 bg-emerald-500/60"
                          : result === 'wrong' ? "w-2 bg-rose-500/60"
                          : "w-2 bg-white/10 hover:bg-white/20"
                        )}
                      />
                    );
                  })}
                </div>
                <button
                  onClick={goNext}
                  disabled={currentCardIndex === generatedCards.length - 1}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all border",
                    currentCardIndex === generatedCards.length - 1
                      ? "text-[var(--text-muted)] cursor-not-allowed opacity-40 border-transparent"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border-white/5 active:scale-[0.97]"
                  )}
                >
                  <span>Next</span><ChevronRight size={15} />
                </button>
              </div>

              {/* Save Deck */}
              <div className="pt-2 border-t border-white/5">
                <Button onClick={handleSave} loading={isSaving} className="w-full flex items-center justify-center gap-2 animate-none">
                  <Check size={16} /><span>Save deck</span>
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT: Large Flip Card (only for standard flashcards) */}
          {!currentCard.choices && (
            <div className="flex items-start justify-center order-1 lg:order-2 w-full">
              <div
                ref={reviewCardRef}
                onClick={() => { setIsFlipped(f => !f); setShowHint(false); }}
                className="cursor-pointer select-none w-full mx-auto"
                style={{ perspective: '1400px', aspectRatio: '1 / 1', maxWidth: '580px' }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentCardIndex}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full"
                  >
                    <div
                      className="relative w-full h-full"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                        willChange: 'transform',
                      }}
                    >
                      {/* Card Front */}
                      <div
                        className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden"
                        style={{ backfaceVisibility: 'hidden' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16161a] to-[#0f0f14] rounded-3xl border border-white/[0.08]" />
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-600/[0.07] rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-violet-500/[0.04] rounded-full blur-3xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col h-full p-8">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-purple-400/80 uppercase tracking-[0.18em]">Question</span>
                              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5 ml-2">
                                <button
                                  type="button"
                                  title={isSpeaking ? "Stop speaking" : "Speak question"}
                                  className="p-1 rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                  onClick={(e) => handleSpeak(e, currentCard.front)}
                                >
                                  <Volume2 size={12} className={cn(isSpeaking ? "animate-pulse text-purple-400" : "")} />
                                </button>
                                <button
                                  type="button"
                                  title="Switch pronunciation language (English / Hindi)"
                                  className="px-1.5 py-0.5 rounded hover:bg-white/10 text-[9px] font-bold text-purple-400 hover:text-purple-300 transition-colors tracking-tight font-sans"
                                  onClick={toggleLanguage}
                                >
                                  {ttsLang === 'en' ? 'EN' : 'HI'}
                                </button>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">{currentCardIndex + 1} / {generatedCards.length}</span>
                          </div>
                          <div className="flex-1 flex items-center justify-center px-3">
                            <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-center leading-relaxed select-none">
                              {currentCard.front}
                            </h2>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-[var(--text-muted)] font-mono tracking-widest uppercase">Click to flip ↻</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Back */}
                      <div
                        className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1e1a] via-[#131a18] to-[#0a120f] rounded-3xl border border-emerald-500/[0.14]" />
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/[0.06] rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-teal-500/[0.04] rounded-full blur-3xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col h-full p-8">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-[0.18em]">Answer</span>
                              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5 ml-2">
                                <button
                                  type="button"
                                  title={isSpeaking ? "Stop speaking" : "Speak answer"}
                                  className="p-1 rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                  onClick={(e) => handleSpeak(e, currentCard.back)}
                                >
                                  <Volume2 size={12} className={cn(isSpeaking ? "animate-pulse text-emerald-400" : "")} />
                                </button>
                                <button
                                  type="button"
                                  title="Switch pronunciation language (English / Hindi)"
                                  className="px-1.5 py-0.5 rounded hover:bg-white/10 text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors tracking-tight font-sans"
                                  onClick={toggleLanguage}
                                >
                                  {ttsLang === 'en' ? 'EN' : 'HI'}
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                              className="p-1.5 rounded-md hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </div>
                          <div className="flex-1 flex items-center justify-center px-3">
                            <p className="text-xl font-medium text-[var(--text-primary)] text-center leading-relaxed select-none">
                              {currentCard.back}
                            </p>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-[var(--text-muted)] font-mono tracking-widest uppercase">How well did you remember?</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* RIGHT: MCQ Answer Detail Panel (only for MCQ decks) */}
          {currentCard.choices && (
            <div className="order-1 lg:order-2 w-full space-y-6">
              {/* Quiz Timer Settings & Ring (Persistent) */}
              <div className="w-full rounded-3xl bg-[#161618] border border-white/5 p-6 shadow-2xl relative overflow-hidden text-left">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Timer Ring Preview (updates in real-time) */}
                  <TimerRing
                    timeLeft={timerLimit * 60}
                    totalDuration={timerLimit * 60}
                    label="Minutes Limit"
                    className="shrink-0 scale-90"
                  />

                  <div className="flex-1 space-y-4 w-full">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="text-purple-400" size={16} />
                        <h3 className="text-xs font-mono uppercase tracking-widest font-semibold text-[var(--text-primary)]">Quiz Time Limit</h3>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
                        Choose a duration up to 60 mins. This ring represents the countdown timer you will face during the quiz.
                      </p>
                    </div>

                    {/* Timer limit selector (direct, no toggle) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Minutes</span>
                        <span className="text-[10px] font-mono text-purple-400">{timerLimit}m</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={60}
                        value={timerLimit}
                        onChange={(e) => setTimerLimit(Math.min(60, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-full accent-purple-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Answer & Explanation (Only displayed when they have made a choice) */}
              <AnimatePresence mode="wait">
                {reviewSelections.get(currentCardIndex) ? (
                  <motion.div
                    key="unlocked"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full rounded-3xl bg-[#161618] border border-white/5 p-8 shadow-2xl relative overflow-hidden text-left"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Answer &amp; Explanation</span>
                        <span className={cn(
                          "text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border",
                          reviewSelections.get(currentCardIndex) === currentCard.back
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        )}>
                          {reviewSelections.get(currentCardIndex) === currentCard.back ? "Correct" : "Incorrect"}
                        </span>
                      </div>
                      
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        {currentCard.explanation || `Correct Answer: ${currentCard.back}`}
                      </p>
                      
                      {currentCard.hint && (
                        <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/10 mt-2 text-left">
                          <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest block mb-1">Hint</span>
                          <p className="text-xs text-purple-300/80 italic leading-relaxed">{currentCard.hint}</p>
                        </div>
                      )}
                    </div>

                    {/* Self-marking Override buttons */}
                    <div className="space-y-3 pt-4 border-t border-white/5 mt-4">
                      <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">Self-Evaluation Override</span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => markCard('wrong')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer",
                            cardResults.get(currentCardIndex) === 'wrong'
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-white/[0.03] text-[var(--text-secondary)] border border-white/5 hover:border-rose-500/20 hover:text-rose-400 hover:bg-rose-500/5"
                          )}
                        >
                          <ThumbsDown size={13} /><span>Mark Wrong</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => markCard('right')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] cursor-pointer",
                            cardResults.get(currentCardIndex) === 'right'
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-white/[0.03] text-[var(--text-secondary)] border border-white/5 hover:border-emerald-500/20 hover:text-emerald-400 hover:bg-emerald-500/5"
                          )}
                        >
                          <ThumbsUp size={13} /><span>Mark Right</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="w-full rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-center text-xs font-mono text-[var(--text-muted)] leading-relaxed">
                    💡 Select an option on the left to reveal answer and explanation details.
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // QUOTA EXCEEDED PHASE
  // ═══════════════════════════════════════════
  if (isQuotaExceeded) {
    const isGroq = selectedModel.startsWith('llama-') || selectedModel.startsWith('gemma-');
    const providerName = isGroq ? 'Groq' : 'Gemini';
    const keyLink = isGroq ? 'https://console.groq.com/keys' : 'https://aistudio.google.com';
    const portalName = isGroq ? 'Groq Console' : 'Google AI Studio';

    return (
      <div className="w-full flex justify-center py-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface border border-purple-500/20 p-8 rounded-xl max-w-xl w-full text-left space-y-6 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Icon & Heading */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Key size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{providerName} API Quota Reached</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">The shared generation limit has been exceeded.</p>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Description */}
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Due to high traffic, Flick's shared {providerName} API key has hit its free-tier rate limit. 
            To generate your flashcards right now, please paste your personal {providerName} API key. It will be saved locally in your browser.
          </p>

          {/* Input Form */}
          <form onSubmit={handleSaveQuotaKey} className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                Your {providerName} API Key
              </label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder={isGroq ? "gsk_..." : "AIzaSy..."}
                className="input-theme w-full px-4 py-3 text-xs placeholder-[var(--text-muted)] font-mono"
                required
              />
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                Don't have a key? You can get a free, personal key in 30 seconds from{' '}
                <a 
                  href={keyLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-purple-400 hover:text-purple-300 font-semibold underline"
                >
                  {portalName}
                </a>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsQuotaExceeded(false)}
                className="flex-1 py-2.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Sparkles size={13} />
                <span>Save &amp; Generate</span>
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // INPUT PHASE
  // ═══════════════════════════════════════════
  return (
    <div className="w-full">
      {/* Usage limit visual meter */}
      <div className="mb-6 bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5 text-left">
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            Flashcard Limit Usage (12h rolling)
          </p>
          <p className="text-[10px] text-[var(--text-secondary)]">
            You have generated {cardsUsed} out of {limit} maximum cards in the last 12 hours.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-36 sm:shrink-0 h-1.5 bg-app border border-[var(--border)] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                percentageLeft <= 15
                  ? "bg-rose-500"
                  : percentageLeft <= 40
                  ? "bg-amber-500"
                  : "bg-purple-500"
              )}
              style={{ width: `${Math.min(100, (cardsUsed / limit) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-[var(--text-primary)] whitespace-nowrap">
            {percentageLeft}% left
          </span>
        </div>
      </div>

      {/* Input Form Card */}
      <div className="bg-surface border border-[var(--border)] p-6 rounded-xl">
        {/* Animated Tabs */}
        <div className="flex items-center gap-1 border-b border-white/5 pb-3 mb-6 relative">
          {tabOptions.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (isGenerating || isExtractingPdf) return;
                  setActiveTab(tab.id);
                }}
                className={cn(
                  "relative flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-4 text-xs font-medium tracking-wide transition-colors duration-200",
                  isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  (isGenerating || isExtractingPdf) ? "opacity-50 pointer-events-none" : ""
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-purple-500 z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Tab Content Panels */}
          <div className="min-h-[140px] relative overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'text' && (
                <motion.div
                  key="text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-left animate-none"
                >
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your study notes, an article, a Wikipedia section — anything..."
                    className="input-theme w-full h-40 p-4 text-sm placeholder-[var(--text-muted)] resize-none"
                  />
                </motion.div>
              )}

              {activeTab === 'pdf' && (
                <motion.div
                  key="pdf"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="animate-none"
                >
                  {!pdfFile ? (
                    <motion.div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border border-dashed rounded-lg h-40 flex flex-col justify-center items-center cursor-pointer transition-colors duration-200 p-6 text-center",
                        isDragActive 
                          ? "border-purple-500 bg-purple-500/5 shadow-[0_0_15px_rgba(124,58,237,0.08)]" 
                          : "border-[var(--border)] bg-app hover:border-[var(--border-hover)]"
                      )}
                      animate={isDragActive ? { scale: 1.01 } : { scale: 1 }}
                      whileHover={{ scale: 1.005 }}
                    >
                      <Upload className={cn("mb-3 transition-colors", isDragActive ? "text-purple-400" : "text-[var(--text-secondary)]")} size={24} />
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        Drop your PDF here
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        or click to browse files
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </motion.div>
                  ) : (
                    <div className="border border-[var(--border)] bg-app rounded-lg p-6 flex items-center justify-between h-40">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 font-mono text-xs font-bold uppercase">
                          PDF
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-[var(--text-primary)] max-w-xs truncate">
                            {pdfFile.name}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearPdf}
                        className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-1"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'url' && (
                <motion.div
                  key="url"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col justify-center h-40 space-y-2 animate-none"
                >
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                      <Link2 size={16} />
                    </span>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://en.wikipedia.org/wiki/..."
                      className="input-theme w-full pl-11 pr-4 py-3 text-sm"
                    />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] pl-1 text-left">
                    Works with Wikipedia, blog posts, documentation, news articles.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form Settings Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-white/5">
            {/* Title Input */}
            <div className="flex flex-col gap-2 text-left">
              <label className="text-xs font-mono text-[var(--text-secondary)] uppercase">
                Deck Name (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="We'll infer one if blank"
                className="input-theme w-full px-4 py-2.5 text-sm"
              />
            </div>

            {/* Generation Mode Selector */}
            <div className="flex flex-col gap-2 text-left">
              <label className="text-xs font-mono text-[var(--text-secondary)] uppercase">
                Generation Mode
              </label>
              <div className="flex items-center gap-2 bg-app border border-[var(--border)] rounded-lg p-1 relative">
                {(['flashcard', 'mcq'] as const).map((mode) => {
                  const isActive = generationMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setGenerationMode(mode)}
                      className={cn(
                        "relative flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 z-10 focus:outline-none",
                        isActive
                          ? "text-white"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <span className="relative z-10">
                        {mode === 'flashcard' ? 'Flashcards' : 'MCQs (Quiz)'}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="activeGenModePill"
                          className="absolute inset-0 bg-purple-600 rounded-md z-0"
                          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card/MCQ Count Selector */}
            <div className="flex flex-col gap-2 text-left">
              <label className="text-xs font-mono text-[var(--text-secondary)] uppercase">
                {generationMode === 'mcq' ? 'Number of MCQs' : 'Number of Cards'}
              </label>
              <div className="flex items-center gap-2 bg-app border border-[var(--border)] rounded-lg p-1 relative">
                {[5, 10, 15, 20].map((num) => {
                  const isActive = cardCount === num;
                  const isDisabled = num === 20 && isModelLimited(selectedModel);
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setCardCount(num)}
                      title={isDisabled ? "This model supports a maximum of 15 cards" : undefined}
                      className={cn(
                        "relative flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 z-10 focus:outline-none",
                        isActive
                          ? "text-white"
                          : isDisabled
                          ? "text-[var(--text-muted)] opacity-30 cursor-not-allowed"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <span className="relative z-10">{num}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeCardCountPill"
                          className="absolute inset-0 bg-purple-600 rounded-md z-0"
                          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Model Selector */}
            <div className="flex flex-col gap-2 text-left">
              <label className="text-xs font-mono text-[var(--text-secondary)] uppercase">
                AI Model Engine
              </label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="input-theme w-full px-4 py-2.5 text-xs bg-surface cursor-pointer focus:outline-none text-[var(--text-primary)]"
                >
                  <optgroup label="Google Gemini" className="bg-surface text-[var(--text-primary)]">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash ⚡️ (Fast, Default)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro 🧠 (Deep Reason)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash 🔄 (Stable)</option>
                  </optgroup>
                  <optgroup label="Groq AI (Ultra Fast)" className="bg-surface text-[var(--text-primary)]">
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B 🦙 (Advanced)</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B 🚀 (Instant Speed)</option>
                    <option value="qwen/qwen3-32b">Qwen3 32B 💎 (High Precision)</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <Button
            type="submit"
            className="w-full flex items-center justify-center gap-2 mt-4"
            disabled={isGenerating || isSaving || isExtractingPdf}
          >
            {isGenerating || isExtractingPdf ? (
              <div className="flex items-center gap-2.5">
                <Loader />
                <span className="text-xs font-mono tracking-wider animate-pulse">
                  {generationStep}
                </span>
              </div>
            ) : (
              <>
                <Sparkles size={16} />
                <span>{generationMode === 'mcq' ? 'Generate MCQs' : 'Generate flashcards'}</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default GenerateForm;
