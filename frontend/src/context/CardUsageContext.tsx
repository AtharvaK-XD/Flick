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
  recordGeneration: (count: number) => void;
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
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).getTime();
      const initKey = `flick_generation_history_init_${user.id}`;
      const historyKey = `flick_generation_history_${user.id}`;
      const isInitialized = localStorage.getItem(initKey) === 'true';

      // 1. Initial seed from database / localStorage saved cards if first time
      if (!isInitialized) {
        let initialCount = 0;
        let oldestTime = new Date().toISOString();
        
        if (isDemoMode) {
          const storedCards = localStorage.getItem('flick_demo_cards') || '[]';
          let parsedCards = [];
          try { parsedCards = JSON.parse(storedCards); } catch(e){}
          const userCards = parsedCards.filter((c: any) => c.user_id === user.id && c.created_at >= new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());
          initialCount = userCards.length;
          if (userCards.length > 0) {
            const sorted = [...userCards].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
            oldestTime = sorted[0].created_at;
          }
        } else {
          const twelveHoursAgoStr = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
          const { count, error } = await supabase
            .from('cards')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', twelveHoursAgoStr);
          
          if (!error && count) {
            initialCount = count;
            const { data } = await supabase
              .from('cards')
              .select('created_at')
              .eq('user_id', user.id)
              .gte('created_at', twelveHoursAgoStr)
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();
            if (data) {
              oldestTime = data.created_at;
            }
          }
        }

        const initialHistory = [];
        if (initialCount > 0) {
          initialHistory.push({
            count: initialCount,
            timestamp: oldestTime
          });
        }
        localStorage.setItem(historyKey, JSON.stringify(initialHistory));
        localStorage.setItem(initKey, 'true');
      }

      // 2. Read history and calculate total cards generated in last 12 hours
      const stored = localStorage.getItem(historyKey) || '[]';
      let history = [];
      try {
        history = JSON.parse(stored);
      } catch (e) {
        history = [];
      }

      const activeRecords = history.filter((r: any) => {
        const time = new Date(r.timestamp).getTime();
        return time >= twelveHoursAgo;
      });

      if (activeRecords.length < history.length) {
        localStorage.setItem(historyKey, JSON.stringify(activeRecords));
      }

      const countUsed = activeRecords.reduce((sum: number, r: any) => sum + (Number(r.count) || 0), 0);
      setCardsUsed(countUsed);

      if (countUsed >= LIMIT) {
        const sorted = [...activeRecords].sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp));
        if (sorted.length > 0) {
          const oldestTime = new Date(sorted[0].timestamp).getTime();
          const resetTimestamp = oldestTime + 12 * 60 * 60 * 1000;
          setResetTime(new Date(resetTimestamp).toISOString());
        } else {
          setResetTime(null);
        }
      } else {
        setResetTime(null);
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

  // Listen for changes in other tabs
  useEffect(() => {
    if (!user) return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `flick_generation_history_${user.id}`) {
        fetchUsage();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, fetchUsage]);

  const recordGeneration = useCallback((count: number) => {
    if (!user) return;
    const key = `flick_generation_history_${user.id}`;
    const stored = localStorage.getItem(key) || '[]';
    try {
      const history = JSON.parse(stored);
      history.push({
        count,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(key, JSON.stringify(history));
      fetchUsage();
    } catch (e) {
      console.error("Error saving generation history:", e);
    }
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
        recordGeneration,
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
