import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDecks } from '../hooks/useDecks';
import DashboardLayout from '../components/layout/DashboardLayout';
import GenerateForm from '../components/features/GenerateForm';
import PageWrapper from '../components/layout/PageWrapper';

export function Generate() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createDeck } = useDecks(user?.id);
  const [isReviewPhase, setIsReviewPhase] = useState(false);

  // Guard routing
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSaveDeck = async (
    title: string,
    sourceType: 'text' | 'pdf' | 'url',
    sourcePreview: string,
    cards: Array<{ front: string; back: string; hint: string; explanation: string }>
  ) => {
    const deck = await createDeck(title, sourceType, sourcePreview, cards);
    if (deck) {
      navigate(`/deck/${deck.id}`);
    } else {
      throw new Error('Failed to create deck. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <PageWrapper className="space-y-6">
        {/* Header — hidden once in review phase */}
        {!isReviewPhase && (
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Generate Flashcards
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              AI-powered deck creation from notes, documents, or URLs.
            </p>
          </div>
        )}

        {/* Generate Form */}
        <GenerateForm onSaveDeck={handleSaveDeck} onPhaseChange={setIsReviewPhase} />
      </PageWrapper>
    </DashboardLayout>
  );
}

export default Generate;
