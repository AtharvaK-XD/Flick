import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useCardUsage } from '../../context/CardUsageContext';
import { LogOut, Plus } from 'lucide-react';

export function Navbar() {
  const { user, signOut, signInWithGoogle, isDemoMode } = useAuth();
  const { percentageLeft, cardsUsed, limit } = useCardUsage();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const isLanding = location.pathname === '/';

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 w-full z-40 transition-all duration-300 h-16 flex items-center px-6",
        isLanding
          ? isScrolled
            ? "backdrop-blur-md bg-black/45 border-b border-white/5"
            : "bg-transparent border-b border-transparent"
          : "backdrop-blur-md bg-app/75 border-b border-[var(--border)]"
      )}
    >
      <div className="w-full flex items-center justify-between">
        {/* Logo */}
        <Link 
          to={user ? "/dashboard" : "/"} 
          className="font-display font-semibold text-xl tracking-tight hover:opacity-80 transition-opacity"
        >
          Flick
        </Link>

        {/* Navigation / User controls */}
        <div className="flex items-center gap-6">
          {user ? (
            <>
              {/* Desktop links */}
              <div className="hidden md:flex items-center gap-6">
                <Link
                  to="/dashboard"
                  className={cn(
                    "text-sm font-medium tracking-wide transition-colors",
                    location.pathname === '/dashboard' 
                      ? "text-purple-400" 
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Dashboard
                </Link>
                <Link
                  to="/generate"
                  className={cn(
                    "text-sm font-medium tracking-wide transition-colors flex items-center gap-1.5",
                    location.pathname === '/generate' 
                      ? "text-purple-400" 
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Plus size={15} />
                  <span>Generate</span>
                </Link>
                <Link
                  to="/settings"
                  className={cn(
                    "text-sm font-medium tracking-wide transition-colors",
                    location.pathname === '/settings' 
                      ? "text-purple-400" 
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Settings
                </Link>
              </div>

              {/* Demo Mode Badge */}
              {isDemoMode && (
                <span className="text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider hidden sm:inline-block">
                  Demo
                </span>
              )}

              {/* Card Limit Badge with premium popup tooltip */}
              <div className="relative group flex items-center">
                <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/5 hover:border-purple-500/20 px-3 py-1.5 rounded-full cursor-help transition-all duration-300">
                  <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        percentageLeft <= 15
                          ? "bg-rose-500"
                          : percentageLeft <= 40
                          ? "bg-amber-500"
                          : "bg-purple-500"
                      )}
                      style={{ width: `${100 - percentageLeft}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-[var(--text-secondary)] whitespace-nowrap">
                    <span className="text-[var(--text-primary)] font-bold">{percentageLeft}%</span> left
                  </span>
                </div>

                {/* Popup Tooltip - Wider, larger font, clearer hierarchy */}
                <div className="absolute top-[calc(100%+10px)] right-0 w-80 p-5 rounded-xl bg-surface border border-[var(--border)] shadow-2xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none z-50 flex flex-col gap-3.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Remaining Limit</span>
                    <span className="text-sm font-mono font-bold text-purple-400">{limit - cardsUsed} cards</span>
                  </div>
                  
                  {/* Detailed counter bar */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          percentageLeft <= 15 ? "bg-rose-500" : percentageLeft <= 40 ? "bg-amber-500" : "bg-purple-500"
                        )}
                        style={{ width: `${(cardsUsed / limit) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                      <span>{cardsUsed} used</span>
                      <span>{limit} card limit</span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-3 mt-0.5">
                    You have <strong className="text-[var(--text-primary)] font-semibold">{limit - cardsUsed}</strong> card allocations left to generate new decks.
                  </p>
                </div>
              </div>

              {/* User profile details */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {user.name}
                  </span>
                </div>
                
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-1"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleSignIn}
              className="text-sm font-medium border border-[var(--border)] bg-surface hover:bg-surface-2 px-4 py-2 rounded-lg transition-colors text-[var(--text-primary)] cursor-pointer active:scale-95 duration-200"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
