import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export interface CardUsageContextType {
  cardsUsed: number;
  limit: number;
  percentageLeft: number;
  loading: boolean;
  refreshUsage: () => Promise<void>;
  canGenerate: (requestedCount: number) => boolean;
}

const LIMIT = 100;

const CardUsageContext = createContext<CardUsageContextType | undefined>(undefined);

export function CardUsageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cardsUsed, setCardsUsed] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setCardsUsed(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (isDemoMode) {
        // Demo Mode - count from LocalStorage
        const storedCards = localStorage.getItem('flick_demo_cards') || '[]';
        const parsedCards = JSON.parse(storedCards);
        const userCards = parsedCards.filter((c: any) => c.user_id === user.id);
        setCardsUsed(userCards.length);
      } else {
        // Supabase Mode - query total cards count
        const { count, error } = await supabase
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (error) throw error;
        setCardsUsed(count || 0);
      }
    } catch (err) {
      console.error('Error fetching card usage:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load and refresh usage when user changes
  useEffect(() => {
    fetchUsage();
  }, [user, fetchUsage]);

  const refreshUsage = useCallback(async () => {
    await fetchUsage();
  }, [fetchUsage]);

  const canGenerate = useCallback((requestedCount: number) => {
    return cardsUsed + requestedCount <= LIMIT;
  }, [cardsUsed]);

  // Calculate percentage of limit left
  const percentageLeft = Math.max(0, Math.round(((LIMIT - cardsUsed) / LIMIT) * 100));

  return (
    <CardUsageContext.Provider
      value={{
        cardsUsed,
        limit: LIMIT,
        percentageLeft,
        loading,
        refreshUsage,
        canGenerate,
      }}
    >
      {children}
    </CardUsageContext.Provider>
  );
}

export function useCardUsage() {
  const context = useContext(CardUsageContext);
  if (!context) {
    throw new Error('useCardUsage must be used within a CardUsageProvider');
  }
  return context;
}
