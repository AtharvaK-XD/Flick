
import { Flame, Zap, Calendar } from 'lucide-react';

interface StatsBarProps {
  streak: number;
  xp: number;
  dueToday: number;
}

export function StatsBar({ streak, xp, dueToday }: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {/* Streak Tile */}
      <div className="bg-surface border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between">
        <span className="text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)]">Current Streak</span>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{streak}</span>
          <span className="text-sm text-[var(--text-secondary)]">days</span>
          <Flame className="ml-auto text-orange-500 shrink-0" size={20} />
        </div>
      </div>

      {/* XP Tile */}
      <div className="bg-surface border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between">
        <span className="text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)]">Total Score</span>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{xp}</span>
          <span className="text-sm text-[var(--text-secondary)] font-mono">XP</span>
          <Zap className="ml-auto text-amber-500 shrink-0" size={20} />
        </div>
      </div>

      {/* Due Today Tile */}
      <div className="bg-surface border border-[var(--border)] p-5 rounded-xl flex flex-col justify-between">
        <span className="text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)]">Due Today</span>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{dueToday}</span>
          <span className="text-sm text-[var(--text-secondary)]">cards</span>
          <Calendar className="ml-auto text-purple-500 shrink-0" size={20} />
        </div>
      </div>
    </div>
  );
}

export default StatsBar;
