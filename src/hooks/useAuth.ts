import { useEffect, useState } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import type { UserStats } from '../types';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
}

const DEMO_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'developer@flick.study',
  name: 'Alex Dev',
  avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
};

const DEFAULT_STATS: UserStats = {
  id: 'stats-demo-id',
  user_id: '00000000-0000-0000-0000-000000000000',
  streak: 3,
  xp: 120,
  total_cards_studied: 24,
  last_study_date: new Date().toISOString().split('T')[0],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);

  // Load user and stats
  useEffect(() => {
    let authSubscription: any = null;

    if (isDemoMode) {
      // 1. Demo Mode
      const storedUser = localStorage.getItem('flick_demo_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        // Load stats
        const storedStats = localStorage.getItem('flick_demo_stats');
        if (storedStats) {
          setStats(JSON.parse(storedStats));
        } else {
          localStorage.setItem('flick_demo_stats', JSON.stringify(DEFAULT_STATS));
          setStats(DEFAULT_STATS);
        }
      }
      setLoading(false);
    } else {
      // 2. Supabase Mode
      // Check current session
      supabase.auth.getSession().then((res: any) => {
        const session = res?.data?.session;
        if (session?.user) {
          const profile: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || '',
          };
          setUser(profile);
          fetchOrCreateStats(profile.id);
        } else {
          setUser(null);
          setStats(null);
        }
        setLoading(false);
      });

      // Listen for changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user) {
          const profile: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || '',
          };
          setUser(profile);
          fetchOrCreateStats(profile.id);
        } else {
          setUser(null);
          setStats(null);
        }
        setLoading(false);
      });

      authSubscription = subscription;
    }

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Fetch or create user stats in Supabase
  const fetchOrCreateStats = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStats(data);
      } else {
        // Create default stats
        const newStats = {
          user_id: userId,
          streak: 0,
          xp: 0,
          total_cards_studied: 0,
          last_study_date: null,
        };
        const { data: inserted, error: insertError } = await supabase
          .from('user_stats')
          .insert(newStats)
          .select('*')
          .single();

        if (insertError) throw insertError;
        setStats(inserted);
      }
    } catch (err) {
      console.error('Error handling user stats:', err);
    }
  };

  const signInWithGoogle = async () => {
    if (isDemoMode) {
      // Simulate Google Sign In for Demo Mode
      localStorage.setItem('flick_demo_user', JSON.stringify(DEMO_USER));
      setUser(DEMO_USER);
      
      const storedStats = localStorage.getItem('flick_demo_stats');
      if (storedStats) {
        setStats(JSON.parse(storedStats));
      } else {
        localStorage.setItem('flick_demo_stats', JSON.stringify(DEFAULT_STATS));
        setStats(DEFAULT_STATS);
      }
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem('flick_demo_user');
      setUser(null);
      setStats(null);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setStats(null);
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const updateStudyStats = async (cardsReviewed: number) => {
    if (!user) return;

    const todayStr = new Date().toISOString().split('T')[0];
    let newStreak = stats ? stats.streak : 0;
    let newXp = stats ? stats.xp : 0;
    let newTotal = stats ? stats.total_cards_studied : 0;

    // Calculate streak
    if (stats) {
      const lastDate = stats.last_study_date;
      if (!lastDate) {
        newStreak = 1;
      } else {
        const last = new Date(lastDate);
        const today = new Date(todayStr);
        const diffTime = today.getTime() - last.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Studied yesterday, increment streak
          newStreak += 1;
        } else if (diffDays > 1) {
          // Missed days, reset streak to 1
          newStreak = 1;
        } else if (diffDays === 0) {
          // Already studied today, keep streak
        }
      }
    } else {
      newStreak = 1;
    }

    // Award XP: 10 XP per card reviewed
    newXp += cardsReviewed * 10;
    newTotal += cardsReviewed;

    const updated = {
      streak: newStreak,
      xp: newXp,
      total_cards_studied: newTotal,
      last_study_date: todayStr,
      updated_at: new Date().toISOString(),
    };

    if (isDemoMode) {
      const fullUpdatedStats: UserStats = {
        ...stats!,
        ...updated,
      };
      localStorage.setItem('flick_demo_stats', JSON.stringify(fullUpdatedStats));
      setStats(fullUpdatedStats);
      
      // Update recent activity in local storage
      const recentKey = 'flick_demo_recent_activity';
      const currentRecent = JSON.parse(localStorage.getItem(recentKey) || '[]');
      const newActivity = {
        id: Math.random().toString(36).substr(2, 9),
        reviewed_count: cardsReviewed,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(recentKey, JSON.stringify([newActivity, ...currentRecent].slice(0, 5)));
    } else {
      try {
        const { data, error } = await supabase
          .from('user_stats')
          .update(updated)
          .eq('user_id', user.id)
          .select('*')
          .single();

        if (error) throw error;
        setStats(data);

        // Track activity in window/history if needed, or through logs
      } catch (err) {
        console.error('Error updating stats:', err);
      }
    }
  };

  const clearAllUserData = async () => {
    if (isDemoMode) {
      localStorage.clear();
      setUser(null);
      setStats(null);
      return { success: true };
    }

    try {
      // With Cascade Delete on decks/cards/user_stats, we can delete user data
      // Delete user decks (which cascades to cards)
      const { error: decksError } = await supabase.from('decks').delete().eq('user_id', user!.id);
      if (decksError) throw decksError;

      // Delete user stats
      const { error: statsError } = await supabase.from('user_stats').delete().eq('user_id', user!.id);
      if (statsError) throw statsError;

      // Sign out user
      await supabase.auth.signOut();
      setUser(null);
      setStats(null);
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting user data:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    user,
    loading,
    stats,
    signInWithGoogle,
    signOut,
    updateStudyStats,
    clearAllUserData,
    isDemoMode,
  };
}
