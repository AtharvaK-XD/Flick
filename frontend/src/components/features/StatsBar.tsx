import { Flame, Zap, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsBarProps {
  streak: number;
  xp: number;
  dueToday: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export function StatsBar({ streak, xp, dueToday }: StatsBarProps) {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-8"
    >
      {/* Streak Tile */}
      <motion.div variants={itemVariants} className="bg-surface border border-[var(--border)] p-3.5 sm:p-5 rounded-xl flex flex-col justify-between">
        <span className="text-[10px] sm:text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)]">Current Streak</span>
        <div className="flex items-baseline gap-1 sm:gap-2 mt-2 sm:mt-3">
          <span className="text-xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">{streak}</span>
          <span className="text-[10px] sm:text-sm text-[var(--text-secondary)]">days</span>
          <Flame className="ml-auto text-orange-500 shrink-0 hidden xs:block" size={18} />
        </div>
      </motion.div>

      {/* XP Tile */}
      <motion.div variants={itemVariants} className="bg-surface border border-[var(--border)] p-3.5 sm:p-5 rounded-xl flex flex-col justify-between">
        <span className="text-[10px] sm:text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)]">Total Score</span>
        <div className="flex items-baseline gap-1 sm:gap-2 mt-2 sm:mt-3">
          <span className="text-xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">{xp}</span>
          <span className="text-[10px] sm:text-sm text-[var(--text-secondary)] font-mono">XP</span>
          <Zap className="ml-auto text-amber-500 shrink-0 hidden xs:block" size={18} />
        </div>
      </motion.div>

      {/* Due Today Tile */}
      <motion.div variants={itemVariants} className="bg-surface border border-[var(--border)] p-3.5 sm:p-5 rounded-xl flex flex-col justify-between">
        <span className="text-[10px] sm:text-xs uppercase font-mono tracking-wider text-[var(--text-secondary)]">Due Today</span>
        <div className="flex items-baseline gap-1 sm:gap-2 mt-2 sm:mt-3">
          <span className="text-xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">{dueToday}</span>
          <span className="text-[10px] sm:text-sm text-[var(--text-secondary)]">cards</span>
          <Calendar className="ml-auto text-purple-500 shrink-0 hidden xs:block" size={18} />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default StatsBar;
