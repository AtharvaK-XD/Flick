import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import DashboardLayout from '../components/layout/DashboardLayout';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { User, Key, Sun, Moon, AlertOctagon, Check, ShieldAlert } from 'lucide-react';

export function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, clearAllUserData } = useAuth();
  
  // Custom API key states
  const [apiKey, setApiKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Dark/Light Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Guard login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Load custom API key and theme on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('flick_custom_gemini_key') || '';
    setApiKey(savedKey);

    const savedTheme = (localStorage.getItem('flick_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
  }, []);

  // Handle Theme Toggle
  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('flick_theme', newTheme);
    
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    toast(`Theme changed to ${newTheme} mode.`, 'success');
  };

  // Handle Save API Key
  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingKey(true);
    try {
      localStorage.setItem('flick_custom_gemini_key', apiKey.trim());
      toast('API Key saved successfully!', 'success');
    } catch (err) {
      toast('Failed to save API key.', 'error');
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleClearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('flick_custom_gemini_key');
    toast('API Key removed.', 'info');
  };

  // Danger zone wipe
  const handleDeleteAllData = async () => {
    const doubleConfirm = window.confirm(
      'WARNING: This will permanently delete all of your decks, card review history, and stats. This cannot be undone. Are you absolutely sure?'
    );
    
    if (doubleConfirm) {
      const confirmText = window.prompt('Please type DELETE to confirm data wiping:');
      if (confirmText === 'DELETE') {
        const result = await clearAllUserData();
        if (result.success) {
          toast('All your account data has been wiped.', 'success');
          navigate('/');
        } else {
          toast(result.error || 'Failed to wipe data.', 'error');
        }
      } else {
        toast('Wipe cancelled: confirmation mismatch.', 'info');
      }
    }
  };

  return (
    <DashboardLayout>
      <PageWrapper className="space-y-10 text-left max-w-2xl">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Settings
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure your study profile, API tokens, and theme styles.
          </p>
        </div>

        {/* 1. Profile Section */}
        {user && (
          <div className="bg-[#161618] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <User size={15} />
              <span>User Profile</span>
            </h2>
            
            <div className="flex items-center gap-4 pt-2">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-12 h-12 rounded-full border border-white/10"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {user.name}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. Custom API Key Section */}
        <div className="bg-[#161618] border border-white/5 rounded-xl p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <Key size={15} />
              <span>Gemini API Key</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Optional. Input your personal Google Gemini API key to override rate limits or generate cards when offline. Kept locally in browser memory.
            </p>
          </div>

          <form onSubmit={handleSaveApiKey} className="space-y-4 pt-2">
            <div className="flex flex-col gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="bg-[#0C0C0E] border border-white/5 focus:border-purple-500/50 rounded-lg px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors font-mono"
              />
              <span className="text-[10px] text-[var(--text-muted)]">
                Get a free key from <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Google AI Studio</a>.
              </span>
            </div>

            <div className="flex gap-2 justify-end">
              {localStorage.getItem('flick_custom_gemini_key') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearApiKey}
                >
                  Clear Key
                </Button>
              )}
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                loading={isSavingKey}
              >
                Save Key
              </Button>
            </div>
          </form>
        </div>

        {/* 3. Theme Toggle Section */}
        <div className="bg-[#161618] border border-white/5 rounded-xl p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <Sun size={15} />
              <span>Appearance</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Choose your interface color mode.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Dark option */}
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold'
                  : 'border-white/5 bg-[#0C0C0E] text-[var(--text-secondary)] hover:border-white/10'
              }`}
            >
              <Moon size={14} />
              <span>Dark Mode</span>
              {theme === 'dark' && <Check size={12} className="ml-1" />}
            </button>

            {/* Light option */}
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 font-bold'
                  : 'border-white/5 bg-[#0C0C0E] text-[var(--text-secondary)] hover:border-white/10'
              }`}
            >
              <Sun size={14} />
              <span>Light Mode</span>
              {theme === 'light' && <Check size={12} className="ml-1" />}
            </button>
          </div>
        </div>

        {/* 4. Danger Zone */}
        <div className="border border-rose-500/10 bg-rose-500/5 rounded-xl p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-rose-400 flex items-center gap-2">
              <AlertOctagon size={15} />
              <span>Danger Zone</span>
            </h2>
            <p className="text-xs text-rose-400/80 leading-relaxed">
              Deleting your account data is irreversible. All decks, cards, metrics, and study streaks will be permanently erased.
            </p>
          </div>

          <div className="pt-2 flex justify-start">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteAllData}
              className="flex items-center gap-1.5"
            >
              <ShieldAlert size={14} />
              <span>Delete all my data</span>
            </Button>
          </div>
        </div>
      </PageWrapper>
    </DashboardLayout>
  );
}

export default Settings;
