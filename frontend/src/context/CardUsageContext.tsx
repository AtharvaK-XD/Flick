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
  resetTime: string | null;
}

const LIMIT = 100;

const CardUsageContext = createContext<CardUsageContextType | undefined>(undefined);

export function CardUsageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cardsUsed, setCardsUsed] = useState<number>(0);
  const [resetTime, setResetTime] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setCardsUsed(0);
      setResetTime(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

      if (isDemoMode) {
        // Demo Mode - count from LocalStorage in last 12 hours
        const storedCards = localStorage.getItem('flick_demo_cards') || '[]';
        const parsedCards = JSON.parse(storedCards);
        const userCards = parsedCards.filter((c: any) => c.user_id === user.id && c.created_at >= twelveHoursAgo);
        const countUsed = userCards.length;
        setCardsUsed(countUsed);

        if (countUsed >= LIMIT) {
          const sorted = [...userCards].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
          if (sorted.length > 0) {
            const oldestTime = new Date(sorted[0].created_at).getTime();
            const resetTimestamp = oldestTime + 12 * 60 * 60 * 1000;
            setResetTime(new Date(resetTimestamp).toISOString());
          } else {
            setResetTime(null);
          }
        } else {
          setResetTime(null);
        }
      } else {
        // Supabase Mode - query cards created in the last 12 hours
        const { count, error } = await supabase
          .from('cards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', twelveHoursAgo);

        if (error) throw error;
        const countUsed = count || 0;
        setCardsUsed(countUsed);

        if (countUsed >= LIMIT) {
          const { data, error: oldestError } = await supabase
            .from('cards')
            .select('created_at')
            .eq('user_id', user.id)
            .gte('created_at', twelveHoursAgo)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!oldestError && data) {
            const oldestTime = new Date(data.created_at).getTime();
            const resetTimestamp = oldestTime + 12 * 60 * 60 * 1000;
            setResetTime(new Date(resetTimestamp).toISOString());
          } else {
            setResetTime(null);
          }
        } else {
          setResetTime(null);
        }
      }
    } catch (err) {
      console.error('Error fetching card usage:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load and refresh usage when user changes, and subscribe to realtime updates
  useEffect(() => {
    fetchUsage();

    if (!user || isDemoMode) return;

    // Subscribe to realtime changes on the cards table for this user
    const channel = supabase
      .channel(`realtime-cards-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUsage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        resetTime,
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
