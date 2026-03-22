'use client';
// Admin-Dashboard/src/app/login/page.tsx
// Part 31B — Admin login page.
//
// INFINITE REDIRECT LOOP FIX:
// Uses isAdminSessionActive() to check if already logged in.
// This hits /api/admin/check-session which reads the httpOnly cookie server-side
// instead of trying to read it from JS (httpOnly cookies are not accessible to JS).

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams }     from 'next/navigation';
import { adminSignIn, isAdminSessionActive } from '@/lib/auth';
import {
  Eye, EyeOff, Lock, Mail,
  ShieldCheck, AlertCircle, Loader2,
} from 'lucide-react';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if already logged in via server-side cookie check
  // (httpOnly cookies can't be read by JS — we ping the server instead)
  useEffect(() => {
    const reason = searchParams.get('reason');
    const err    = searchParams.get('error');
    if (reason === 'session_expired') setError('Your session expired. Please sign in again.');
    if (err    === 'unauthorized')    setError('Access denied. This account is not an admin.');

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

    // adminSignIn now sets a server-side httpOnly cookie via /api/admin/set-session.
    // router.replace sends a new request to the server which includes that cookie.
    // The proxy reads the cookie → valid → lets through → dashboard loads.
    const redirectTo = searchParams.get('redirect') ?? '/dashboard';
    router.replace(redirectTo);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080810]">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#080810] px-4">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(108,99,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(108,99,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px]
                      bg-[#6C63FF] opacity-[0.06] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-[400px]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/30
                          flex items-center justify-center shadow-lg shadow-[#6C63FF]/10">
            <ShieldCheck className="w-7 h-7 text-[#6C63FF]" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">DeepDive Admin</h1>
            <p className="text-sm text-white/40 mt-1">Restricted access — admins only</p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.07] p-8"
          style={{ background: 'linear-gradient(135deg, #13131F 0%, #0D0D1A 100%)' }}
        >
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20
                            rounded-xl px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                             pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25
                             outline-none focus:border-[#6C63FF]/60 focus:bg-white/[0.06]
                             transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                             pl-10 pr-12 py-3 text-sm text-white placeholder:text-white/25
                             outline-none focus:border-[#6C63FF]/60 focus:bg-white/[0.06]
                             transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2
                             text-white/30 hover:text-white/60 transition-colors"
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
                         bg-[#6C63FF] hover:bg-[#5A52E0] active:scale-[0.98]
                         transition-all duration-150 disabled:opacity-60
                         disabled:cursor-not-allowed flex items-center justify-center
                         gap-2 shadow-lg shadow-[#6C63FF]/25"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying access…</>
                : 'Sign In'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-5">
          No registration available. Admin accounts are created manually.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#080810]">
        <Loader2 className="w-8 h-8 text-[#6C63FF] animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}