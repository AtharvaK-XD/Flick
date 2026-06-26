import React from 'react';
import { cn } from '../../lib/utils';
import Loader from './Loader';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white shadow-lg shadow-purple-900/10 border border-purple-500/20',
    secondary: 'border border-white/5 bg-[#161618] hover:bg-[#1E1E22] hover:border-white/10 text-[var(--text-primary)] shadow-sm active:bg-black/20',
    danger: 'border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 text-rose-400 active:bg-rose-500/20',
    ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 active:bg-white/10 border border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
          <Loader />
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
