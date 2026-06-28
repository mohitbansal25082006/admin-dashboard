'use client';
// Admin-Dashboard/src/app/login/page.tsx
// Part 55.13 — Admin login page with full theme integration, mobile optimization, and logo.

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { adminSignIn, isAdminSessionActive } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import {
  Eye, EyeOff, Lock, Mail,
  ShieldCheck, AlertCircle, Loader2,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLight } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if already logged in via server-side cookie check
  useEffect(() => {
    const reason = searchParams.get('reason');
    const err = searchParams.get('error');
    if (reason === 'session_expired') setError('Your session expired. Please sign in again.');
    if (err === 'unauthorized') setError('Access denied. This account is not an admin.');

    isAdminSessionActive().then(active => {
      if (active) {
        const redirectTo = searchParams.get('redirect') ?? '/dashboard';
        router.replace(redirectTo);
      } else {
        setCheckingSession(false);
      }
    });
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    const { success, error: signInError } = await adminSignIn(email.trim(), password);
    setLoading(false);

    if (!success) {
      setError(signInError ?? 'Login failed.');
      return;
    }

    const redirectTo = searchParams.get('redirect') ?? '/dashboard';
    router.replace(redirectTo);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  const cardBg = isLight ? 'var(--background-elevated)' : 'var(--background-card)';
  const inputBg = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)';
  const borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'var(--background)' }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px),
                            linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Glow */}
      <div 
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px]
                   blur-[120px] rounded-full pointer-events-none"
        style={{ 
          backgroundColor: 'var(--primary)',
          opacity: isLight ? 0.08 : 0.06,
        }}
      />

      <div className="relative w-full max-w-[400px]">
        {/* Brand - with logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
          >
            <Image
              src="/icon.png"
              alt="DeepDive Logo"
              width={56}
              height={56}
              className="object-contain"
              style={{ 
                width: 52, 
                height: 52,
                display: 'block',
              }}
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              DeepDive Admin
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Restricted access — admins only
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-6 sm:p-8"
          style={{
            backgroundColor: cardBg,
            borderColor: borderColor,
          }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Sign in to your account
          </h2>

          {error && (
            <div 
              className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`,
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-xl pl-10 pr-12 py-3 text-sm outline-none transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`,
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-xl font-semibold text-sm text-white
                         transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying access…</>
                : 'Sign In'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
          No registration available. Admin accounts are created manually.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}