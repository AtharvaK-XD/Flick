
interface StatsBarProps {
  streak: number;
  xp: number;
  dueToday: number;
}

export function StatsBar({ streak, xp, dueToday }: StatsBarProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {/* Streak Tile */}
      <div 
        className="bg-[#161618] border border-white/5 p-4 rounded-lg flex flex-col justify-between"
      >
        <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)]">
          Current Streak
        </span>
        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {streak}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">days</span>
          <span className="ml-auto text-lg" aria-hidden="true">🔥</span>
        </div>
      </div>

      {/* XP Tile */}
      <div 
        className="bg-[#161618] border border-white/5 p-4 rounded-lg flex flex-col justify-between"
      >
        <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)]">
          Total Score
        </span>
        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {xp}
          </span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">XP</span>
          <span className="ml-auto text-lg" aria-hidden="true">⚡</span>
        </div>
      </div>

      {/* Due Today Tile */}
      <div 
        className="bg-[#161618] border border-white/5 p-4 rounded-lg flex flex-col justify-between"
      >
        <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)]">
          Due Today
        </span>
        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {dueToday}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">cards</span>
          <span className="ml-auto text-lg" aria-hidden="true">📅</span>
        </div>
      </div>
    </div>
  );
}

export default StatsBar;
