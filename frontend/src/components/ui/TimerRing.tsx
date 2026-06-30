import { cn } from '../../lib/utils';

interface TimerRingProps {
  timeLeft: number;
  totalDuration: number;
  label?: string;
  isCountingUp?: boolean;
  className?: string;
}

export function TimerRing({
  timeLeft,
  totalDuration,
  label,
  isCountingUp = false,
  className,
}: TimerRingProps) {
  const percentRemaining = isCountingUp 
    ? 1 
    : totalDuration > 0 
      ? Math.max(0, Math.min(1, timeLeft / totalDuration)) 
      : 1;

  const radius = 80;
  const strokeDasharray = 2 * Math.PI * radius; // ~502.65
  const strokeDashoffset = strokeDasharray * (1 - percentRemaining);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const isLowTime = !isCountingUp && timeLeft <= 30;

  return (
    <div className={cn("flex flex-col items-center justify-center relative", className)}>
      <style>{`
        @keyframes slow-spin-timer {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-slow-spin-timer {
          transform-origin: center;
          animation: slow-spin-timer 40s linear infinite;
        }
      `}</style>

      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* SVG Progress Ring */}
        <svg className="w-full h-full transform -rotate-90">
          {/* Outer Dash Compass Ring (rotating) */}
          <circle
            cx="96"
            cy="96"
            r="88"
            className="stroke-purple-500/10 fill-none animate-slow-spin-timer"
            strokeWidth="1.5"
            strokeDasharray="6, 12"
          />

          {/* Background Track Circle */}
          <circle
            cx="96"
            cy="96"
            r="80"
            className="stroke-white/[0.03] fill-none"
            strokeWidth="9"
          />

          {/* Active Progress Circle */}
          <circle
            cx="96"
            cy="96"
            r="80"
            className={cn(
              "fill-none transition-all duration-1000 ease-linear",
              isLowTime ? "stroke-rose-500" : "stroke-purple-500"
            )}
            strokeWidth="9"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              filter: isLowTime 
                ? 'drop-shadow(0 0 8px rgba(244,63,94,0.4))' 
                : 'drop-shadow(0 0 8px rgba(124,58,237,0.3))'
            }}
          />
        </svg>

        {/* Center Text Panel */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={cn(
            "text-3xl font-bold font-mono tracking-tight transition-all duration-300",
            isLowTime 
              ? "text-rose-400 animate-pulse font-extrabold scale-105" 
              : "text-[var(--text-primary)]"
          )}>
            {timeString}
          </span>
          {label && (
            <span className={cn(
              "text-[9px] font-mono uppercase tracking-widest mt-1 block",
              isLowTime ? "text-rose-400/80" : "text-[var(--text-muted)]"
            )}>
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default TimerRing;
