import { useState, useEffect, useCallback } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import type { Card } from '../types';
import { sm2 } from '../lib/sm2';

export function useCards(deckId?: string) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cards belonging to this deck (or all cards if deckId is omitted)
  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      // Demo Mode
      try {
        const storedCards = localStorage.getItem('flick_demo_cards') || '[]';
        const parsedCards: Card[] = JSON.parse(storedCards);
        const filteredCards = deckId ? parsedCards.filter(c => c.deck_id === deckId) : parsedCards;
        setCards(filteredCards);
      } catch (err) {
        setError('Failed to fetch cards locally');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Supabase Mode
    try {
      let query = supabase.from('cards').select('*');
      if (deckId) {
        query = query.eq('deck_id', deckId);
      }
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setCards(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cards');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  // Load cards on mount or deckId change
  useEffect(() => {
    fetchCards();
  }, [deckId, fetchCards]);

  // Helper to calculate statistics of currently loaded cards
  const getCardStats = useCallback(() => {
    let mastered = 0;
    let learning = 0;
    let newCards = 0;

    cards.forEach(card => {
      if (card.repetitions === 0) {
        newCards += 1;
      } else if (card.ease_factor > 2.8) {
        mastered += 1;
      } else {
        learning += 1;
      }
    });

    return { mastered, learning, newCards, total: cards.length };
  }, [cards]);

  // Update card review metrics using SM-2
  const reviewCard = async (cardId: string, quality: 0 | 1 | 2 | 3): Promise<Card | null> => {
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return null;

    const card = cards[cardIndex];
    const sm2Result = sm2(
      quality,
      card.repetitions,
      card.ease_factor,
      card.interval_days
    );

    const nextReviewStr = sm2Result.nextReview.toISOString().split('T')[0];

    const updatedFields = {
      repetitions: sm2Result.repetitions,
      ease_factor: sm2Result.easeFactor,
      interval_days: sm2Result.interval,
      next_review: nextReviewStr,
    };

    if (isDemoMode) {
      // Demo Mode
      try {
        const storedCards = localStorage.getItem('flick_demo_cards') || '[]';
        const parsedCards: Card[] = JSON.parse(storedCards);
        
        const globalIndex = parsedCards.findIndex(c => c.id === cardId);
        if (globalIndex !== -1) {
          const updatedCard = {
            ...parsedCards[globalIndex],
            ...updatedFields,
          };
          parsedCards[globalIndex] = updatedCard;
          localStorage.setItem('flick_demo_cards', JSON.stringify(parsedCards));
          
          // Update local state
          setCards(prev => {
            const copy = [...prev];
            copy[cardIndex] = updatedCard;
            return copy;
          });
          return updatedCard;
        }
        return null;
      } catch (err) {
        console.error('Failed to save card review locally', err);
        return null;
      }
    }

    // Supabase Mode
    try {
      const { data, error: updateError } = await supabase
        .from('cards')
        .update(updatedFields)
        .eq('id', cardId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      // Update local state
      setCards(prev => {
        const copy = [...prev];
        copy[cardIndex] = data;
        return copy;
      });

      return data;
    } catch (err) {
      console.error('Error updating review metrics:', err);
      return null;
    }
  };

  // Update card content (front/back/hint)
  const updateCardContent = async (
    cardId: string,
    front: string,
    back: string,
    hint?: string | null
  ): Promise<boolean> => {
    const fieldsToUpdate = {
      front,
      back,
      hint: hint || null,
    };

    if (isDemoMode) {
      try {
        const storedCards = localStorage.getItem('flick_demo_cards') || '[]';
        const parsedCards: Card[] = JSON.parse(storedCards);
        const index = parsedCards.findIndex(c => c.id === cardId);
        
        if (index !== -1) {
          parsedCards[index] = {
            ...parsedCards[index],
            ...fieldsToUpdate,
          };
          localStorage.setItem('flick_demo_cards', JSON.stringify(parsedCards));
          
          // Update state
          setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...fieldsToUpdate } : c));
          return true;
        }
        return false;
      } catch (e) {
        console.error(e);
        return false;
      }
    }

    try {
      const { error: updateError } = await supabase
        .from('cards')
        .update(fieldsToUpdate)
        .eq('id', cardId);

      if (updateError) throw updateError;
      
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...fieldsToUpdate } : c));
      return true;
    } catch (err) {
      console.error('Error updating card content:', err);
      return false;
    }
  };

  // Delete card from deck
  const deleteCard = async (cardId: string): Promise<boolean> => {
    if (isDemoMode) {
      try {
        const storedCards = localStorage.getItem('flick_demo_cards') || '[]';
        const parsedCards: Card[] = JSON.parse(storedCards);
        const filtered = parsedCards.filter(c => c.id !== cardId);
        localStorage.setItem('flick_demo_cards', JSON.stringify(filtered));

        // Decrement card_count on corresponding deck in LocalStorage
        if (deckId) {
          const storedDecks = localStorage.getItem('flick_demo_decks') || '[]';
          const parsedDecks = JSON.parse(storedDecks);
          const deckIdx = parsedDecks.findIndex((d: any) => d.id === deckId);
          if (deckIdx !== -1) {
            parsedDecks[deckIdx].card_count = Math.max(0, parsedDecks[deckIdx].card_count - 1);
            localStorage.setItem('flick_demo_decks', JSON.stringify(parsedDecks));
          }
        }

        setCards(prev => prev.filter(c => c.id !== cardId));
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    }

    try {
      const { error: deleteError } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId);

      if (deleteError) throw deleteError;

      // React trigger handles deck count decrement on DB side, 
      // but let's refresh local list
      setCards(prev => prev.filter(c => c.id !== cardId));
      return true;
    } catch (err) {
      console.error('Error deleting card:', err);
      return false;
    }
  };

  return {
    cards,
    loading,
    error,
    fetchCards,
    getCardStats,
    reviewCard,
    updateCardContent,
    deleteCard,
  };
}
