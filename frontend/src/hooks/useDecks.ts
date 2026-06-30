import { useState, useEffect, useCallback } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import type { Deck, Card, SourceType } from '../types';

export function useDecks(userId?: string) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all decks for user
  const fetchDecks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      // Demo Mode
      try {
        const storedDecks = localStorage.getItem('flick_demo_decks') || '[]';
        const parsedDecks: Deck[] = JSON.parse(storedDecks);
        // Filter by current user ID (for simulated user consistency)
        const userDecks = parsedDecks.filter(d => d.user_id === userId);
        setDecks(userDecks);
      } catch (err) {
        setError('Failed to load local decks');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Supabase Mode
    try {
      const { data, error: fetchError } = await supabase
        .from('decks')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDecks(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch decks');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load decks on mount/userId change
  useEffect(() => {
    if (userId) {
      fetchDecks();
    } else {
      setDecks([]);
    }
  }, [userId, fetchDecks]);

  // Fetch a single deck by ID
  const getDeck = useCallback(async (deckId: string): Promise<Deck | null> => {
    if (isDemoMode) {
      const storedDecks = localStorage.getItem('flick_demo_decks') || '[]';
      const parsedDecks: Deck[] = JSON.parse(storedDecks);
      const found = parsedDecks.find(d => d.id === deckId);
      return found || null;
    }

    try {
      const { data, error: getError } = await supabase
        .from('decks')
        .select('*')
        .eq('id', deckId)
        .maybeSingle();

      if (getError) throw getError;
      return data;
    } catch (err) {
      console.error('Error fetching deck:', err);
      return null;
    }
  }, []);

  // Create a new deck with generated cards
  const createDeck = async (
    title: string,
    sourceType: SourceType,
    sourcePreview: string,
    cardsData: Array<{ front: string; back: string; hint: string; explanation: string; choices?: string[] }>
  ): Promise<Deck | null> => {
    if (!userId) return null;
    setLoading(true);
    setError(null);

    const deckId = isDemoMode ? Math.random().toString(36).substring(2, 11) : '';

    if (isDemoMode) {
      // Demo Mode
      try {
        const todayIso = new Date().toISOString();
        const newDeck: Deck = {
          id: deckId,
          user_id: userId,
          title,
          source_type: sourceType,
          source_preview: sourcePreview,
          card_count: cardsData.length,
          created_at: todayIso,
          updated_at: todayIso,
        };

        const todayStr = new Date().toISOString().split('T')[0];
        const newCards: Card[] = cardsData.map((c) => {
          const exp = c.choices 
            ? JSON.stringify({ explanation: c.explanation || '', choices: c.choices })
            : (c.explanation || null);
          return {
            id: Math.random().toString(36).substring(2, 11),
            deck_id: deckId,
            user_id: userId,
            front: c.front,
            back: c.back,
            explanation: exp,
            hint: c.hint || null,
            next_review: todayStr,
            interval_days: 1,
            ease_factor: 2.5,
            repetitions: 0,
            created_at: todayIso,
          };
        });

        // Save Deck
        const storedDecks = localStorage.getItem('flick_demo_decks') || '[]';
        const parsedDecks: Deck[] = JSON.parse(storedDecks);
        parsedDecks.unshift(newDeck);
        localStorage.setItem('flick_demo_decks', JSON.stringify(parsedDecks));

        // Save Cards
        const storedCards = localStorage.getItem('flick_demo_cards') || '[]';
        const parsedCards: Card[] = JSON.parse(storedCards);
        localStorage.setItem('flick_demo_cards', JSON.stringify([...newCards, ...parsedCards]));

        // Refresh deck list
        setDecks(prev => [newDeck, ...prev]);
        return newDeck;
      } catch (err) {
        setError('Failed to save deck locally');
        return null;
      } finally {
        setLoading(false);
      }
    }

    // Supabase Mode
    try {
      // 1. Insert Deck
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .insert({
          user_id: userId,
          title,
          source_type: sourceType,
          source_preview: sourcePreview,
          card_count: cardsData.length,
        })
        .select('*')
        .single();

      if (deckError) throw deckError;

      // 2. Insert Cards in batch
      const todayStr = new Date().toISOString().split('T')[0];
      const cardsToInsert = cardsData.map(c => {
        const exp = c.choices 
          ? JSON.stringify({ explanation: c.explanation || '', choices: c.choices })
          : (c.explanation || null);
        return {
          deck_id: deck.id,
          user_id: userId,
          front: c.front,
          back: c.back,
          explanation: exp,
          hint: c.hint || null,
          next_review: todayStr,
        };
      });

      const { error: cardsError } = await supabase
        .from('cards')
        .insert(cardsToInsert);

      if (cardsError) throw cardsError;

      // Refresh deck list
      setDecks(prev => [deck, ...prev]);
      return deck;
    } catch (err: any) {
      setError(err.message || 'Failed to create deck');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a deck (automatically deletes cards due to cascade)
  const deleteDeck = async (deckId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      // Demo Mode
      try {
        // Delete deck
        const storedDecks = localStorage.getItem('flick_demo_decks') || '[]';
        const parsedDecks: Deck[] = JSON.parse(storedDecks);
        const filteredDecks = parsedDecks.filter(d => d.id !== deckId);
        localStorage.setItem('flick_demo_decks', JSON.stringify(filteredDecks));

        // Delete associated cards
        const storedCards = localStorage.getItem('flick_demo_cards') || '[]';
        const parsedCards: Card[] = JSON.parse(storedCards);
        const filteredCards = parsedCards.filter(c => c.deck_id !== deckId);
        localStorage.setItem('flick_demo_cards', JSON.stringify(filteredCards));

        // Refresh lists
        setDecks(prev => prev.filter(d => d.id !== deckId));
        return true;
      } catch (err) {
        setError('Failed to delete deck locally');
        return false;
      } finally {
        setLoading(false);
      }
    }

    // Supabase Mode
    try {
      const { error: deleteError } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId);

      if (deleteError) throw deleteError;

      // Refresh list
      setDecks(prev => prev.filter(d => d.id !== deckId));
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete deck');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    decks,
    loading,
    error,
    fetchDecks,
    getDeck,
    createDeck,
    deleteDeck,
  };
}
