import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Link2, FileText, X, Sparkles, Check } from 'lucide-react';
import { generateCards, inferTitle } from '../../lib/gemini';
import Button from '../ui/Button';
import Loader from '../ui/Loader';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDFJS CDN Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.370'}/build/pdf.worker.min.mjs`;

interface GenerateFormProps {
  onSaveDeck: (title: string, sourceType: 'text' | 'pdf' | 'url', sourcePreview: string, cards: any[]) => Promise<any>;
}

export function GenerateForm({ onSaveDeck }: GenerateFormProps) {
  const { toast } = useToast();
  
  // Tabs: 'text' | 'pdf' | 'url'
  const [activeTab, setActiveTab] = useState<'text' | 'pdf' | 'url'>('text');
  
  // Title & Card Count
  const [title, setTitle] = useState('');
  const [cardCount, setCardCount] = useState<number>(10);
  
  // Inputs
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Generation States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generatedCards, setGeneratedCards] = useState<Array<{ front: string; back: string; hint: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Drag and Drop State
  const [isDragActive, setIsDragActive] = useState(false);

  // Handle PDF text extraction
  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    // Load document using pdfjs-dist
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    // Read page contents
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
        try {
          setGenerationStep('Extracting PDF text...');
          const extracted = await extractPdfText(file);
          setPdfText(extracted);
          toast(`Successfully read PDF: ${file.name}`, 'success');
        } catch (err) {
          console.error(err);
          toast('Failed to read PDF text. Try another PDF.', 'error');
          setPdfFile(null);
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
      try {
        setGenerationStep('Extracting PDF text...');
        const extracted = await extractPdfText(file);
        setPdfText(extracted);
        toast(`Successfully read PDF: ${file.name}`, 'success');
      } catch (err) {
        console.error(err);
        toast('Failed to read PDF text. Try another PDF.', 'error');
        setPdfFile(null);
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
    
    let contentToProcess = '';
    
    if (activeTab === 'text') {
      if (!textInput.trim() || textInput.trim().length < 50) {
        toast('Please paste at least 50 characters of content.', 'error');
        return;
      }
      contentToProcess = textInput;
    } else if (activeTab === 'pdf') {
      if (!pdfText) {
        toast('Please upload a PDF and wait for text extraction.', 'error');
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
        // Direct scraping using Jina Reader (CORS enabled)
        const jinaUrl = `https://r.jina.ai/${urlInput.trim()}`;
        const response = await fetch(jinaUrl, {
          headers: { 'Accept': 'text/plain' }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }
        
        contentToProcess = await response.text();
      } catch (err: any) {
        console.error(err);
        toast(`Failed to load URL content: ${err.message}`, 'error');
        setIsGenerating(false);
        return;
      }
    }

    setIsGenerating(true);
    setGeneratedCards([]); // clear existing

    try {
      setGenerationStep('Asking Gemini AI...');
      // Retrieve key from local storage if saved
      const customKey = localStorage.getItem('flick_custom_gemini_key') || undefined;
      
      setGenerationStep('Building cards...');
      const result = await generateCards(contentToProcess, cardCount, customKey);
      
      if (result.cards && result.cards.length > 0) {
        setGeneratedCards(result.cards);
        
        // Auto-infer title if user left it blank
        if (!title.trim()) {
          const inferred = result.title || inferTitle(contentToProcess);
          setTitle(inferred);
        }
        
        toast(`Successfully generated ${result.cards.length} cards!`, 'success');
      } else {
        throw new Error('AI returned 0 cards. Please try different content.');
      }
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to generate cards.', 'error');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Inline edit handler
  const handleEditCard = (index: number, field: 'front' | 'back' | 'hint', value: string) => {
    setGeneratedCards(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value
      };
      return copy;
    });
  };

  const handleRemoveCard = (index: number) => {
    setGeneratedCards(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (generatedCards.length === 0) return;
    setIsSaving(true);

    const finalTitle = title.trim() || 'New Deck';
    const sourceType = activeTab;
    let sourcePreview = '';

    if (activeTab === 'text') {
      sourcePreview = textInput.slice(0, 200);
    } else if (activeTab === 'pdf') {
      sourcePreview = pdfFile ? pdfFile.name : 'Uploaded PDF';
    } else {
      sourcePreview = urlInput;
    }

    try {
      await onSaveDeck(finalTitle, sourceType, sourcePreview, generatedCards);
      toast('Deck saved successfully!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save deck.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const tabOptions = [
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'pdf', label: 'PDF', icon: Upload },
    { id: 'url', label: 'URL', icon: Link2 },
  ] as const;

  return (
    <div className="w-full">
      {/* Input Form Card */}
      <div className="bg-[#161618] border border-white/5 p-6 rounded-xl mb-8">
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
                  if (isGenerating) return;
                  setActiveTab(tab.id);
                  setGeneratedCards([]); // clear generated cards on tab switch
                }}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wide transition-colors duration-200",
                  isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  isGenerating ? "opacity-50 pointer-events-none" : ""
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
          <div className="min-h-[140px]">
            {activeTab === 'text' && (
              <div className="animate-fade-up">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste your study notes, an article, a Wikipedia section — anything..."
                  className="w-full h-40 bg-[#0C0C0E] border border-white/5 focus:border-purple-500/50 rounded-lg p-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none transition-colors"
                />
              </div>
            )}

            {activeTab === 'pdf' && (
              <div className="animate-fade-up">
                {!pdfFile ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border border-dashed rounded-lg h-40 flex flex-col justify-center items-center cursor-pointer transition-colors duration-150 p-6 text-center",
                      isDragActive 
                        ? "border-purple-500 bg-purple-500/5" 
                        : "border-white/5 bg-[#0C0C0E] hover:border-white/10"
                    )}
                  >
                    <Upload className="text-[var(--text-secondary)] mb-3" size={24} />
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
                  </div>
                ) : (
                  <div className="border border-white/5 bg-[#0C0C0E] rounded-lg p-6 flex items-center justify-between h-40">
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
              </div>
            )}

            {activeTab === 'url' && (
              <div className="animate-fade-up flex flex-col justify-center h-40 space-y-2">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                    <Link2 size={16} />
                  </span>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://en.wikipedia.org/wiki/..."
                    className="w-full bg-[#0C0C0E] border border-white/5 focus:border-purple-500/50 rounded-lg pl-11 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
                  />
                </div>
                <p className="text-xs text-[var(--text-secondary)] pl-1 text-left">
                  Works with Wikipedia, blog posts, documentation, news articles.
                </p>
              </div>
            )}
          </div>

          {/* Form Settings Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
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
                className="bg-[#0C0C0E] border border-white/5 focus:border-purple-500/50 rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
              />
            </div>

            {/* Card Count Selector */}
            <div className="flex flex-col gap-2 text-left">
              <label className="text-xs font-mono text-[var(--text-secondary)] uppercase">
                Number of Cards
              </label>
              <div className="flex items-center gap-2 bg-[#0C0C0E] border border-white/5 rounded-lg p-1">
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCardCount(num)}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors duration-150",
                      cardCount === num
                        ? "bg-purple-600 text-white"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <Button
            type="submit"
            className="w-full flex items-center justify-center gap-2 mt-4"
            disabled={isGenerating || isSaving}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2.5">
                <Loader />
                <span className="text-xs font-mono tracking-wider animate-pulse">
                  {generationStep}
                </span>
              </div>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate flashcards</span>
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Generated Cards Review Area */}
      <AnimatePresence>
        {generatedCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6 text-left"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-md font-medium tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <span>Generated Review Cards</span>
                <span className="text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                  {generatedCards.length}
                </span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-mono">
                Click text below to edit before saving
              </p>
            </div>

            {/* List of generated cards */}
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
              {generatedCards.map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-[#161618] border border-white/5 p-4 rounded-lg flex flex-col gap-3 group relative hover:border-white/10"
                >
                  <button
                    onClick={() => handleRemoveCard(idx)}
                    className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-rose-400 transition-colors p-1"
                    title="Delete card"
                  >
                    <X size={14} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Front Editor */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                        Front (Question)
                      </span>
                      <textarea
                        value={card.front}
                        onChange={(e) => handleEditCard(idx, 'front', e.target.value)}
                        className="bg-[#0C0C0E] border border-transparent focus:border-purple-500/30 rounded px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none h-14"
                      />
                    </div>

                    {/* Back Editor */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                        Back (Answer)
                      </span>
                      <textarea
                        value={card.back}
                        onChange={(e) => handleEditCard(idx, 'back', e.target.value)}
                        className="bg-[#0C0C0E] border border-transparent focus:border-purple-500/30 rounded px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none h-14"
                      />
                    </div>
                  </div>

                  {/* Hint Editor */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                      Hint
                    </span>
                    <input
                      type="text"
                      value={card.hint}
                      onChange={(e) => handleEditCard(idx, 'hint', e.target.value)}
                      className="bg-[#0C0C0E] border border-transparent focus:border-purple-500/30 rounded px-3 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Save Deck Action */}
            <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setGeneratedCards([])}
                disabled={isSaving}
              >
                Clear
              </Button>
              <Button
                onClick={handleSave}
                loading={isSaving}
                className="flex items-center gap-2"
              >
                <Check size={16} />
                <span>Save deck</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GenerateForm;
