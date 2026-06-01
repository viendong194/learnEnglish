'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import StickyBottomNav from '../../components/layout/StickyBottomNav';
import VocabTab from '../../components/notebook/VocabTab';
import GrammarTab from '../../components/notebook/GrammarTab';
import { syncLocalToCloud } from '../../lib/supabase/sync';

export default function NotebookPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('vocab');
  const [selectedIds, setSelectedIds] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await syncLocalToCloud();
      // Reload pages
      router.refresh();
    } catch (err) {
      console.error('Manual sync failure:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handlePracticeSelected = () => {
    if (selectedIds.length === 0) return;
    // Route to chat with target practice items as search parameters
    router.push(`/chat?practice=${selectedIds.join(',')}`);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Top Header */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between border-b border-slate-900/60 glassmorphism z-30">
        <div>
          <h1 className="text-xl font-black text-white font-outfit tracking-tight">Study Notebook</h1>
          <p className="text-[11px] text-slate-500 font-medium">Local-first Dexie DB</p>
        </div>

        {/* Sync Now Button with Rotating Spinner */}
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="flex items-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </header>

      {/* Tab Selectors */}
      <div className="px-6 pt-4 z-20">
        <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-1 relative">
          <button
            onClick={() => setActiveTab('vocab')}
            className={`flex-1 py-2.5 text-xs font-bold font-outfit rounded-lg transition-all duration-300 relative z-10 cursor-pointer ${
              activeTab === 'vocab' ? 'text-white' : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            {activeTab === 'vocab' && (
              <span className="absolute inset-0 bg-indigo-600/10 border border-indigo-500/20 rounded-lg -z-10 animate-fade-in" />
            )}
            Vocabulary
          </button>

          <button
            onClick={() => setActiveTab('grammar')}
            className={`flex-1 py-2.5 text-xs font-bold font-outfit rounded-lg transition-all duration-300 relative z-10 cursor-pointer ${
              activeTab === 'grammar' ? 'text-white' : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            {activeTab === 'grammar' && (
              <span className="absolute inset-0 bg-violet-600/10 border border-violet-500/20 rounded-lg -z-10 animate-fade-in" />
            )}
            Grammar Rules
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 px-6 pt-4 pb-44 overflow-y-auto no-scrollbar z-10">
        {activeTab === 'vocab' ? (
          <VocabTab selectedIds={selectedIds} onToggleSelect={handleToggleSelect} />
        ) : (
          <GrammarTab selectedIds={selectedIds} onToggleSelect={handleToggleSelect} />
        )}
      </div>

      {/* Sticky Bottom Action Bar (visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="absolute bottom-20 inset-x-0 px-6 py-3.5 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-40 animate-slide-up">
          <button
            onClick={handlePracticeSelected}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-between shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer animate-glow"
          >
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-white animate-pulse">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              <span>Practice Speaking with Selected</span>
            </div>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-lg font-bold text-[10px]">
              {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'}
            </span>
          </button>
        </div>
      )}

      {/* Sticky Tab Navigation Bar */}
      <StickyBottomNav />
    </div>
  );
}
