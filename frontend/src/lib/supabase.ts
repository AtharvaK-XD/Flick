import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if we should run in demo mode (local storage fallback)
export const isDemoMode =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('your-project-ref') ||
  supabaseAnonKey.includes('your-supabase-anon-key');

// Export client. If in demo mode, provide standard dummy structures to prevent crash on imports.
export const supabase = isDemoMode
  ? ({
      auth: {
        onAuthStateChange: (callback: any) => {
          // Trigger callback with null user immediately
          callback('SIGNED_OUT', null);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOAuth: async () => ({ error: null }),
        signOut: async () => ({ error: null }),
      },
      storage: {
        from: () => ({
          upload: async () => ({ data: { path: 'mock-path' }, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: 'mock-url' } }),
        }),
      },
    } as any)
  : createClient(supabaseUrl, supabaseAnonKey);
