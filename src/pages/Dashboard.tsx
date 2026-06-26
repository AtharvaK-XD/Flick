import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDecks } from '../hooks/useDecks';
import { useCards } from '../hooks/useCards';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatsBar from '../components/features/StatsBar';
import DeckGrid from '../components/features/DeckGrid';
import { Plus, Clock } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { formatDate } from '../lib/utils';

interface ActivityItem {
  id: string;
  deck_title: string;
  reviewed_count: number;
  timestamp: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user, stats, loading: authLoading } = useAuth();
  const { decks } = useDecks(user?.id);
  const { cards: allCards } = useCards();

  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  // Redirect if logged out
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Load recent study activity from local storage
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`flick_recent_activity_${user.id}`);
      if (stored) {
        setRecentActivities(JSON.parse(stored));
      } else {
        // Provide mock initial activities to make the dashboard look active and premium
        const mockInitial: ActivityItem[] = [
          {
            id: 'mock-act-1',
            deck_title: 'Demo: Spaced Repetition (SM-2)',
            reviewed_count: 5,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
          },
          {
            id: 'mock-act-2',
            deck_title: 'Demo: React & Vite Concepts',
            reviewed_count: 8,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          }
        ];
        localStorage.setItem(`flick_recent_activity_${user.id}`, JSON.stringify(mockInitial));
        setRecentActivities(mockInitial);
      }
    }
  }, [user]);

  // Calculate total cards due today
  const getDueTodayCount = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return allCards.filter((c) => c.next_review <= todayStr).length;
  };

  const handleCreateDeckClick = () => {
    navigate('/generate');
  };

  return (
    <DashboardLayout>
      <PageWrapper className="space-y-10">
        {/* Dashboard Title Header */}
        <div className="flex justify-between items-center text-left">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Dashboard
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Welcome back. Here is your learning progress.
            </p>
          </div>
          <button
            onClick={handleCreateDeckClick}
            className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors border border-purple-500/20"
          >
            <Plus size={14} />
            <span>New Deck</span>
          </button>
        </div>

        {/* Stats Grid */}
        <StatsBar
          streak={stats?.streak || 0}
          xp={stats?.xp || 0}
          dueToday={getDueTodayCount()}
        />

        {/* Your Decks Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono">
              Your Decks
            </h2>
          </div>

          <DeckGrid
            decks={decks}
            allCards={allCards}
          />
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-4 pt-4 border-t border-white/5 text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-mono flex items-center gap-2">
            <Clock size={14} />
            <span>Recent Activity</span>
          </h2>
          
          <div className="bg-[#161618] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
            {recentActivities.slice(0, 3).map((activity) => (
              <div 
                key={activity.id}
                className="px-5 py-4 flex items-center justify-between text-xs hover:bg-[#1E1E22]/50 transition-colors"
              >
                <div className="space-y-1 flex-1 min-w-0 pr-4">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate">
                    {activity.deck_title}
                  </h3>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                    Reviewed {activity.reviewed_count} cards
                  </span>
                </div>
                
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                    {formatDate(activity.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            
            {recentActivities.length === 0 && (
              <div className="px-5 py-6 text-center text-xs text-[var(--text-secondary)]">
                No recent study activity recorded.
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    </DashboardLayout>
  );
}

export default Dashboard;
