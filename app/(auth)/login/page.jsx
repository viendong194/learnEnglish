'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      setMessage('Login successful! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-8 relative bg-slate-950 overflow-hidden">
      {/* Dynamic blurred accent lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none" />

      <div className="w-full max-w-sm glassmorphism rounded-2xl p-8 border border-slate-900 shadow-xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          {/* Custom animated logo */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-outfit">Welcome Back</h2>
          <p className="text-slate-400 text-sm mt-1 text-center">Continue your personalized language study</p>
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

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-wider font-bold mb-1 ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              placeholder="you@domain.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 ml-1">
              <label className="block text-slate-400 text-xs uppercase tracking-wider font-bold">Password</label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-bold shadow-md hover:from-indigo-600 hover:to-violet-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs">
          <span className="text-slate-500">New to LingoGlide? </span>
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
