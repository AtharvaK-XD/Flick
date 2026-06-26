import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navbar from './Navbar';
import { Home, Sparkles, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Generate', path: '/generate', icon: Sparkles },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#0C0C0E] text-[var(--text-primary)] flex flex-col">
      {/* Top Navbar - Handles mobile menu and top right avatar */}
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 flex w-full relative pt-16">
        {/* Left Sidebar (Desktop Only) */}
        <aside 
          className="hidden md:flex fixed top-16 left-0 bottom-0 w-[260px] bg-[#0C0C0E] border-r border-white/5 flex-col justify-between p-6 z-20"
        >
          {/* Logo / Title */}
          <div className="space-y-8">
            <div className="flex items-center gap-2 px-1">
              <span className="font-display font-medium text-lg tracking-tight select-none">
                flick
              </span>
              {isDemoMode && (
                <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  Demo
                </span>
              )}
            </div>

            {/* Nav Menu */}
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 select-none",
                      isActive 
                        ? "bg-purple-600/10 text-purple-400 border border-purple-500/15" 
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:bg-white/5"
                    )}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile Block at bottom of Sidebar */}
          {user && (
            <div className="pt-4 border-t border-white/5 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] truncate">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 border border-white/5 hover:border-white/10 bg-white/5 hover:bg-white/10 active:bg-black/20 text-[10px] font-semibold py-2 rounded-lg transition-colors text-[var(--text-secondary)] hover:text-red-400"
              >
                <LogOut size={13} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Panel Content Area */}
        <div className="flex-1 md:pl-[260px] flex flex-col min-w-0">
          <main className="flex-1 p-6 md:p-10 max-w-5xl w-full mx-auto relative z-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
