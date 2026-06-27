import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card3D } from '../components/ui/Card3D';
import PageWrapper from '../components/layout/PageWrapper';
import { useToast } from '../components/ui/Toast';

export function Login() {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);



  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast(error.message || 'Failed to sign in. Please try again.', 'error');
      } else {
        toast('Welcome back!', 'success');
        navigate('/dashboard');
      }
    } catch (e: any) {
      toast(e.message || 'An error occurred during sign in.', 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <PageWrapper className="min-h-screen bg-app flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Floating dynamic backdrop orbs */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] rounded-full blur-[130px] pointer-events-none select-none" 
        style={{ 
          background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
          animation: 'float1 18s infinite ease-in-out' 
        }} 
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] rounded-full blur-[150px] pointer-events-none select-none" 
        style={{ 
          background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)',
          animation: 'float2 24s infinite ease-in-out' 
        }} 
      />

      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(50px, -80px) scale(1.15); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-70px, 50px) scale(0.9); }
        }
      `}</style>

      {/* Glassmorphic 3D Card Container */}
      <Card3D 
        maxRotation={8} 
        className="w-full max-w-sm backdrop-blur-xl bg-surface/70 border border-[var(--border)] p-8 rounded-2xl shadow-[0_0_60px_rgba(124,58,237,0.15)] hover:border-purple-500/20 transition-all duration-500 space-y-8 text-center relative z-10"
      >
        {/* Title Logo (Upgraded Gradient Text) */}
        <div className="space-y-2.5">
          <h1 className="font-display font-bold text-4xl tracking-tighter bg-gradient-to-r from-purple-400 via-indigo-200 to-purple-300 bg-clip-text text-transparent select-none">
            Flick
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-normal leading-relaxed">
            AI-Powered Active Recall. 
            <br />
            Sign in to continue.
          </p>
        </div>

        {/* Google sign-in button (frosted design) */}
        <div className="pt-2">
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full inline-flex items-center justify-center gap-3 border border-[var(--border)] hover:border-purple-500/40 bg-app hover:bg-surface hover:shadow-[0_0_25px_rgba(124,58,237,0.2)] active:scale-[0.98] text-xs font-semibold px-4 py-3.5 rounded-xl transition-all duration-300 text-[var(--text-primary)] cursor-pointer"
          >
            {/* SVG Google Icon */}
            <svg 
              className="w-4 h-4 shrink-0" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Small footer warning */}
        <p className="text-[10px] text-[var(--text-muted)] font-normal leading-normal max-w-[200px] mx-auto">
          By continuing, you agree to our terms of service and privacy policies.
        </p>
      </Card3D>
    </PageWrapper>
  );
}

export default Login;
