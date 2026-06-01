'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      setMessage('Account registered! Please check email or login.');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-8 relative bg-slate-950 overflow-hidden">
      {/* Blurred decorative glowing blob */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-violet-500/10 blur-[60px] pointer-events-none" />

      <div className="w-full max-w-sm glassmorphism rounded-2xl p-8 border border-slate-900 shadow-xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-500 to-fuchsia-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-outfit">Get Started</h2>
          <p className="text-slate-400 text-sm mt-1 text-center">Join LingoGlide to track study progress offline</p>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-medium text-center animate-fade-in">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs rounded-xl font-medium text-center animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider font-bold mb-1 ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              placeholder="you@domain.com"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider font-bold mb-1 ml-1">Create Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider font-bold mb-1 ml-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl text-sm font-bold shadow-md hover:from-violet-600 hover:to-fuchsia-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs">
          <span className="text-slate-500">Already registered? </span>
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
