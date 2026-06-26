import { useNavigate } from 'react-router-dom';
import { Card3D } from '../ui/Card3D';
import type { Deck, Card } from '../../types';
import { truncateText } from '../../lib/utils';
import { BookOpen, ArrowRight } from 'lucide-react';

interface DeckGridProps {
  decks: Deck[];
  allCards: Card[];
}

export function DeckGrid({ decks, allCards }: DeckGridProps) {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to get due cards and mastery percentage for a deck
  const getDeckMetrics = (deckId: string, cardCount: number) => {
    const deckCards = allCards.filter((c) => c.deck_id === deckId);
    
    // Count due cards
    const dueCount = deckCards.filter((c) => c.next_review <= todayStr).length;
    
    // Calculate mastery %: (ease > 2.8 and repetitions > 0)
    const masteredCount = deckCards.filter((c) => c.ease_factor > 2.8 && c.repetitions > 0).length;
    const masteryPercentage = cardCount > 0 ? Math.round((masteredCount / cardCount) * 100) : 0;
    
    return { dueCount, masteryPercentage };
  };

  // Color logic for due badge
  const getDueBadgeClass = (count: number) => {
    if (count === 0) return 'bg-[#1E1E22] text-[var(--text-muted)] border-white/5';
    if (count <= 5) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (count <= 15) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'; // overdue
  };

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-white/5 bg-[#161618] rounded-xl p-8">
        <BookOpen className="text-[var(--text-muted)] mb-3" size={28} />
        <h3 className="text-md font-medium text-[var(--text-primary)]">
          No decks yet.
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs">
          Generate your first flashcard deck by feeding in notes, a URL, or an uploaded PDF.
        </p>
        <button
          onClick={() => navigate('/generate')}
          className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        >
          <span>Generate deck</span>
          <ArrowRight size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
      {decks.map((deck) => {
        const { dueCount, masteryPercentage } = getDeckMetrics(deck.id, deck.card_count);
        
        return (
          <Card3D
            key={deck.id}
            maxRotation={6}
            onClick={() => navigate(`/deck/${deck.id}`)}
            className="group cursor-pointer bg-[#161618] border border-white/5 hover:border-white/10 rounded-xl p-5 flex flex-col justify-between h-[160px] relative overflow-hidden transition-all duration-300 shadow-sm"
          >
            {/* Top Row */}
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-purple-400 transition-colors truncate">
                  {deck.title}
                </h3>
                <span className="text-[10px] text-[var(--text-muted)] font-mono block mt-1">
                  Created {new Date(deck.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Source Badge with Tooltip */}
              <div className="relative group/tooltip shrink-0">
                <span className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full font-mono text-[var(--text-secondary)] uppercase cursor-help select-none">
                  {deck.source_type}
                </span>
                
                {/* Custom Tooltip */}
                {deck.source_preview && (
                  <div className="absolute right-0 top-6 scale-95 opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 pointer-events-none transition-all duration-150 origin-top-right z-30 w-56 p-2.5 rounded bg-[#1E1E22] border border-white/10 shadow-2xl text-[10px] leading-relaxed text-[var(--text-secondary)] font-mono">
                    <span className="text-[9px] uppercase tracking-wider text-purple-400 block mb-1">Source Preview</span>
                    {truncateText(deck.source_preview, 100)}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="space-y-3 mt-auto">
              <div className="flex items-center justify-between">
                {/* Card Count */}
                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  {deck.card_count} {deck.card_count === 1 ? 'card' : 'cards'}
                </span>

                {/* Due Count Badge */}
                <span 
                  className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full shrink-0 select-none ${getDueBadgeClass(dueCount)}`}
                >
                  {dueCount === 0 ? 'All caught up' : `${dueCount} due`}
                </span>
              </div>

              {/* Mastery progress bar */}
              <div className="space-y-1">
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-500 rounded-full" 
                    style={{ width: `${masteryPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono text-[var(--text-muted)]">
                  <span>MASTERY</span>
                  <span>{masteryPercentage}%</span>
                </div>
              </div>
            </div>
          </Card3D>
        );
      })}
    </div>
  );
}

export default DeckGrid;
