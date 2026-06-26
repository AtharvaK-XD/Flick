import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Plus } from 'lucide-react';

export function Navbar() {
  const { user, signOut, isDemoMode } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const isLanding = location.pathname === '/';

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
          : "backdrop-blur-md bg-[#0C0C0E]/75 border-b border-white/5"
      )}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        {/* Logo */}
        <Link 
          to={user ? "/dashboard" : "/"} 
          className="font-display font-medium text-lg tracking-tight hover:opacity-80 transition-opacity"
        >
          flick
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
                    "text-xs font-medium tracking-wide transition-colors",
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
                    "text-xs font-medium tracking-wide transition-colors flex items-center gap-1",
                    location.pathname === '/generate' 
                      ? "text-purple-400" 
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Plus size={13} />
                  <span>Generate</span>
                </Link>
                <Link
                  to="/settings"
                  className={cn(
                    "text-xs font-medium tracking-wide transition-colors",
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
                <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider hidden sm:inline-block">
                  Demo
                </span>
              )}

              {/* User profile details */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-right hidden sm:block">
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {user.name}
                  </span>
                </div>
                
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-7 h-7 rounded-full border border-white/10"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-1"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="text-xs font-medium border border-white/5 bg-[#161618] hover:bg-[#1E1E22] px-3.5 py-1.5 rounded-lg transition-colors text-[var(--text-primary)]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
