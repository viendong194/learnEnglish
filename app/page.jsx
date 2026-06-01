'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StickyBottomNav from '../components/layout/StickyBottomNav';
import { db } from '../lib/dexie/db';
import { supabase } from '../lib/supabase/client';

export default function HomePage() {
  const [vocabCount, setVocabCount] = useState(0);
  const [grammarCount, setGrammarCount] = useState(0);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    // Load local stats
    const loadStats = async () => {
      try {
        const vCount = await db.vocabulary.count();
        const gCount = await db.grammar.count();
        setVocabCount(vCount);
        setGrammarCount(gCount);
      } catch (err) {
        console.error('Error counting Dexie records:', err);
      }
    };

    // Load auth info
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email);
      }
    };

    loadStats();
    checkUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Background glowing ambient elements */}
      <div className="absolute top-10 left-10 w-44 h-44 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-44 h-44 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      {/* Profile/Welcome Header */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between z-30">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-400">Welcome back</span>
          <h1 className="text-2xl font-black text-white font-outfit leading-tight mt-0.5">
            {userEmail ? userEmail.split('@')[0] : 'Language Learner'}
          </h1>
        </div>

        {userEmail ? (
          <button
            onClick={handleSignOut}
            className="text-[10px] bg-slate-900/60 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 px-3 py-1.5 rounded-xl text-slate-400 font-bold transition-all active:scale-95 cursor-pointer"
          >
            Sign Out
          </button>
        ) : (
          <Link
            href="/login"
            className="text-[10px] bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 rounded-xl text-white font-bold transition-all shadow shadow-indigo-500/10 active:scale-95 cursor-pointer"
          >
            Sign In
          </Link>
        )}
      </header>

      {/* Main Home Dashboard Frame */}
      <div className="flex-1 px-6 pt-2 pb-24 overflow-y-auto no-scrollbar space-y-6 z-20">
        {/* Core dynamic stat cards */}
        <section className="grid grid-cols-2 gap-4">
          <div className="glassmorphism-card rounded-2xl p-4 border border-slate-900 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Local Vocab</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black font-outfit text-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.3)]">
                {vocabCount}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">words</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 font-medium">Offline IndexedDB</span>
          </div>

          <div className="glassmorphism-card rounded-2xl p-4 border border-slate-900 flex flex-col justify-between h-28 relative overflow-hidden group hover:border-violet-500/20 transition-all duration-300">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Grammar Rules</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-black font-outfit text-violet-400 drop-shadow-[0_0_6px_rgba(167,139,250,0.3)]">
                {grammarCount}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">notes</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 font-medium">Auto-synced</span>
          </div>
        </section>

        {/* Feature quick access boards */}
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-wider font-extrabold text-slate-500 ml-1">Learning Modules</h2>

          <Link href="/chat" className="block group">
            <div className="glassmorphism-card rounded-2xl p-5 border border-slate-900 hover:border-indigo-500/30 transition-all duration-300 flex items-center justify-between group-active:scale-[0.99] cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5.5 h-5.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100 font-outfit">AI Conversation Partner</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Real-time voice chats and instant feedback</p>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>

          <Link href="/notebook" className="block group">
            <div className="glassmorphism-card rounded-2xl p-5 border border-slate-900 hover:border-violet-500/30 transition-all duration-300 flex items-center justify-between group-active:scale-[0.99] cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5.5 h-5.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100 font-outfit">Personal Notebook</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Manage vocabulary lists and grammar notes</p>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>
        </section>

        {/* Sync explanation block */}
        <section className="bg-slate-900/30 rounded-2xl p-4 border border-slate-900/60 text-center">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Offline-First synchronization
          </h4>
          <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto">
            All vocabulary and grammar cards are stored locally in the browser immediately. When internet is detected, they are automatically synchronized to Supabase Cloud securely.
          </p>
        </section>
      </div>

      {/* Interactive Bottom Navigation tab */}
      <StickyBottomNav />
    </div>
  );
}
