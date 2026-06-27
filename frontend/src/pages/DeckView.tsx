import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDecks } from '../hooks/useDecks';
import { useCards } from '../hooks/useCards';
import { useCardUsage } from '../context/CardUsageContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import CardEditor from '../components/features/CardEditor';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { ArrowLeft, Play, Trash2 } from 'lucide-react';

export function DeckView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { user, loading: authLoading } = useAuth();
  const { getDeck, deleteDeck } = useDecks(user?.id);
  const { cards, loading: cardsLoading, getCardStats, updateCardContent, deleteCard } = useCards(id);
  const { refreshUsage } = useCardUsage();

  const [deck, setDeck] = useState<any>(null);
  const [deckLoading, setDeckLoading] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  
  // Cram Mode State
  const [cramMode, setCramMode] = useState(false);

  // Guard routing
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Fetch Deck Details
  useEffect(() => {
    if (id) {
      setDeckLoading(true);
      getDeck(id).then((data) => {
        setDeck(data);
        setDeckLoading(false);
      });
    }
  }, [id, getDeck]);

  const handleDeleteDeck = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this entire deck? This action cannot be undone.')) {
      const success = await deleteDeck(id);
      if (success) {
        await refreshUsage();
        toast('Deck deleted successfully', 'success');
        navigate('/dashboard');
      } else {
        toast('Failed to delete deck', 'error');
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const success = await deleteCard(cardId);
    if (success) {
      await refreshUsage();
      toast('Card deleted successfully', 'success');
    }
    return success;
  };

  // Calculate card due details
  const todayStr = new Date().toISOString().split('T')[0];
  const dueCards = cards.filter((c) => c.next_review <= todayStr);
  const dueCount = dueCards.length;

  const { mastered, learning, newCards, total } = getCardStats();

  const masteredPct = total > 0 ? (mastered / total) * 100 : 0;
  const learningPct = total > 0 ? (learning / total) * 100 : 0;
  const newPct = total > 0 ? (newCards / total) * 100 : 0;

  const handleStudy = () => {
    if (total === 0) {
      toast('Add some cards to this deck first.', 'info');
      return;
    }
    if (!cramMode && dueCount === 0) {
      toast('All caught up! Toggle Cram mode to study anyway.', 'info');
      return;
    }
    navigate(`/study/${id}${cramMode ? '?cram=true' : ''}`);
  };

  const isPageLoading = deckLoading || cardsLoading;

  if (isPageLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[40vh] flex items-center justify-center text-xs font-mono text-[var(--text-secondary)]">
          Loading deck contents...
        </div>
      </DashboardLayout>
    );
  }

  if (!deck) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 space-y-4 text-left">
          <h2 className="text-sm font-semibold text-rose-500">Deck not found</h2>
          <p className="text-xs text-[var(--text-secondary)]">The deck you are looking for does not exist or has been deleted.</p>
          <Button onClick={() => navigate('/dashboard')} variant="secondary">
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageWrapper className="space-y-8 text-left">
        {/* Navigation row */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors select-none"
        >
          <ArrowLeft size={13} />
          <span>Back to Dashboard</span>
        </Link>

        {/* Deck Header Title Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {deck.title}
              </h1>
              <span className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full font-mono text-[var(--text-secondary)] uppercase select-none">
                {deck.source_type}
              </span>
            </div>
            
            <p className="text-[10px] font-mono text-[var(--text-muted)]">
              Created {new Date(deck.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="danger"
              onClick={handleDeleteDeck}
              className="flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </Button>
            
            <Button
              onClick={handleStudy}
              disabled={total === 0 || (!cramMode && dueCount === 0)}
              className="flex items-center gap-1.5 shadow-md shadow-purple-900/10"
            >
              <Play size={14} fill="currentColor" />
              <span>
                {cramMode ? 'Cram Session' : `Study (${dueCount} due)`}
              </span>
            </Button>
          </div>
        </div>

        {/* Deck Spaced Repetition Stats Bar */}
        {total > 0 && (
          <div className="bg-surface border border-[var(--border)] p-5 rounded-xl space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[var(--text-primary)]">
                Mastery Progression
              </span>
              <span className="text-purple-400 font-mono font-semibold">
                {Math.round(masteredPct)}%
              </span>
            </div>

            {/* Horizontal progress bar segments */}
            <div className="h-1.5 w-full flex bg-white/5 rounded-full overflow-hidden">
              <div 
                style={{ width: `${masteredPct}%` }} 
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`Mastered: ${mastered}`}
              />
              <div 
                style={{ width: `${learningPct}%` }} 
                className="bg-amber-500 h-full transition-all duration-300"
                title={`Learning: ${learning}`}
              />
              <div 
                style={{ width: `${newPct}%` }} 
                className="bg-white/10 h-full transition-all duration-300"
                title={`New: ${newCards}`}
              />
            </div>

            {/* Metrics Legend */}
            <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-secondary)] border-t border-white/5 pt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Mastered ({mastered})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Learning ({learning})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white/10" />
                <span>New ({newCards})</span>
              </span>
            </div>
          </div>
        )}

        {/* Cram Mode toggle and count headers */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
            Cards list ({total})
          </div>

          {/* Cram Mode Slider Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--text-secondary)] select-none">
              Cram Mode
            </span>
            <button
              onClick={() => {
                setCramMode(!cramMode);
                if (!cramMode && dueCount === 0) {
                  toast('Cram mode enabled: study all cards.', 'info');
                } else if (cramMode) {
                  toast('Standard mode enabled: study due cards only.', 'info');
                }
              }}
              className={`w-9 h-5 rounded-full transition-colors relative outline-none flex items-center p-0.5 border border-white/5 ${
                cramMode ? 'bg-purple-600' : 'bg-white/10'
              }`}
            >
              <div 
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  cramMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Card Accordion List */}
        <div className="space-y-3 pb-8">
          {cards.map((card) => (
            <CardEditor
              key={card.id}
              card={card}
              isExpanded={expandedCardId === card.id}
              onToggleExpand={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)}
              onSave={updateCardContent}
              onDelete={handleDeleteCard}
            />
          ))}

          {cards.length === 0 && (
            <div className="text-center py-10 border border-dashed border-white/5 rounded-lg text-xs text-[var(--text-secondary)]">
              This deck has no cards. How did you do this?
            </div>
          )}
        </div>
      </PageWrapper>
    </DashboardLayout>
  );
}

export default DeckView;
