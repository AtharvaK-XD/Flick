import { useState, type MouseEvent } from 'react';
import type { Card } from '../../types';
import { Trash2, Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';

interface CardEditorProps {
  card: Card;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSave: (cardId: string, front: string, back: string, hint?: string | null) => Promise<boolean>;
  onDelete: (cardId: string) => Promise<boolean>;
}

export function CardEditor({
  card,
  isExpanded,
  onToggleExpand,
  onSave,
  onDelete,
}: CardEditorProps) {
  const { toast } = useToast();
  
  // Local edit states
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [hint, setHint] = useState(card.hint || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!front.trim() || !back.trim()) {
      toast('Front and back text cannot be empty.', 'error');
      return;
    }
    setIsSaving(true);
    const success = await onSave(card.id, front.trim(), back.trim(), hint.trim() || null);
    setIsSaving(false);
    if (success) {
      toast('Card updated successfully!', 'success');
      onToggleExpand(); // collapse
    } else {
      toast('Failed to update card.', 'error');
    }
  };

  const handleDelete = async (e: MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this card?')) {
      setIsDeleting(true);
      const success = await onDelete(card.id);
      setIsDeleting(false);
      if (success) {
        toast('Card deleted successfully!', 'success');
      } else {
        toast('Failed to delete card.', 'error');
      }
    }
  };

  const handleCopy = (e: MouseEvent) => {
    e.stopPropagation();
    const clipText = `Q: ${card.front}\nA: ${card.back}`;
    navigator.clipboard.writeText(clipText);
    toast('Copied to clipboard!', 'success');
  };

  return (
    <div 
      className={cn(
        "border border-white/5 bg-[#161618] rounded-lg overflow-hidden transition-all duration-200",
        isExpanded ? "border-purple-500/20 shadow-md shadow-purple-950/5" : "hover:border-white/10"
      )}
    >
      {/* Accordion Header Row */}
      <div 
        onClick={onToggleExpand}
        className="px-5 py-3.5 flex items-center justify-between cursor-pointer select-none group/row"
      >
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mr-4 text-left">
          {/* Question (Front) */}
          <div className="text-sm font-medium text-[var(--text-primary)] truncate">
            {card.front}
          </div>
          
          {/* Answer (Back) - Faded out, un-fades on hover of row */}
          <div className="text-sm text-[var(--text-secondary)] truncate opacity-20 group-hover/row:opacity-100 transition-opacity duration-300 md:block hidden">
            {card.back}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-1"
            title="Copy Q&A to Clipboard"
          >
            <Copy size={13} />
          </button>
          
          {isExpanded ? (
            <ChevronUp size={15} className="text-[var(--text-secondary)]" />
          ) : (
            <ChevronDown size={15} className="text-[var(--text-secondary)]" />
          )}
        </div>
      </div>

      {/* Accordion Expand Panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-white/5 bg-[#0C0C0E]/50 space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                    Front (Question)
                  </label>
                  <textarea
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    className="bg-[#0C0C0E] border border-white/5 focus:border-purple-500/30 rounded p-2.5 text-xs text-[var(--text-primary)] focus:outline-none resize-none h-20"
                  />
                </div>

                {/* Back Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                    Back (Answer)
                  </label>
                  <textarea
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    className="bg-[#0C0C0E] border border-white/5 focus:border-purple-500/30 rounded p-2.5 text-xs text-[var(--text-primary)] focus:outline-none resize-none h-20"
                  />
                </div>
              </div>

              {/* Hint Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                  Hint
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  className="bg-[#0C0C0E] border border-white/5 focus:border-purple-500/30 rounded px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
                  placeholder="Provide a nudge without giving it away"
                />
              </div>

              {/* Spaced Repetition Stats (Monospace Info) */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-mono text-[var(--text-muted)] pt-1 border-t border-white/5">
                <span>REPETITIONS: {card.repetitions}</span>
                <span>EASE FACTOR: {card.ease_factor.toFixed(2)}</span>
                <span>INTERVAL: {card.interval_days}d</span>
                <span>NEXT REVIEW: {card.next_review}</span>
              </div>

              {/* Save/Delete Actions */}
              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="danger"
                  size="sm"
                  loading={isDeleting}
                  onClick={handleDelete}
                  className="flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Delete card</span>
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleExpand}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isSaving}
                    onClick={handleSave}
                    className="flex items-center gap-1"
                  >
                    <Check size={13} />
                    <span>Save changes</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default CardEditor;
