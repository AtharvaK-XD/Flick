import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDecks } from '../hooks/useDecks';
import { useCards } from '../hooks/useCards';
import StudyMode from '../components/features/StudyMode';
import PageWrapper from '../components/layout/PageWrapper';
import { useToast } from '../components/ui/Toast';

export function Study() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const { user, loading: authLoading, updateStudyStats } = useAuth();
  const { getDeck } = useDecks(user?.id);
  const { cards, loading: cardsLoading, reviewCard } = useCards(id);

  const [deck, setDeck] = useState<any>(null);
  const [deckLoading, setDeckLoading] = useState(true);
  const [studyCards, setStudyCards] = useState<any[]>([]);

  const isCramMode = searchParams.get('cram') === 'true';

  // Guard login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Load Deck
  useEffect(() => {
    if (id) {
      setDeckLoading(true);
      getDeck(id).then((data) => {
        setDeck(data);
        setDeckLoading(false);
      });
    }
  }, [id, getDeck]);

  // Filter study cards based on mode
  useEffect(() => {
    if (!cardsLoading && cards.length > 0) {
      if (isCramMode) {
        // Cram Mode: Shuffle all cards and study
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        setStudyCards(shuffled);
      } else {
        // Spaced Repetition Mode: Study only due cards
        const todayStr = new Date().toISOString().split('T')[0];
        const due = cards.filter((c) => c.next_review <= todayStr);
        // Shuffle due cards to prevent memorizing order
        const shuffledDue = [...due].sort(() => Math.random() - 0.5);
        setStudyCards(shuffledDue);
      }
    }
  }, [cards, cardsLoading, isCramMode]);

  const handleFinishSession = async (reviewedCount: number) => {
    if (reviewedCount > 0) {
      try {
        // 1. Update stats (XP, Streak, Studied Count)
        await updateStudyStats(deck?.title || 'Study Session', reviewedCount);

        // 2. Log recent activity in localStorage (specifically for Dashboard)
        if (user && deck) {
          const activityKey = `flick_recent_activity_${user.id}`;
          const currentActivity = JSON.parse(localStorage.getItem(activityKey) || '[]');
          
          const newSession = {
            id: Math.random().toString(36).substring(2, 9),
            deck_title: deck.title,
            reviewed_count: reviewedCount,
            timestamp: new Date().toISOString(),
          };

          const updatedActivity = [newSession, ...currentActivity].slice(0, 5); // Keep last 5
          localStorage.setItem(activityKey, JSON.stringify(updatedActivity));
        }

        toast(`Session stats saved. +${reviewedCount * 10} XP!`, 'success');
      } catch (err) {
        console.error('Error saving study session stats:', err);
      }
    }
  };

  const handleClose = () => {
    navigate(`/deck/${id}`);
  };

  const isPageLoading = deckLoading || cardsLoading;

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center text-xs font-mono text-[var(--text-secondary)]">
        Initializing study session...
      </div>
    );
  }

  return (
    <PageWrapper className="min-h-screen bg-[#0C0C0E]">
      <StudyMode
        deckTitle={deck?.title || 'Study Session'}
        cards={studyCards}
        onReviewCard={reviewCard}
        onFinishSession={handleFinishSession}
        onClose={handleClose}
      />
    </PageWrapper>
  );
}

export default Study;
