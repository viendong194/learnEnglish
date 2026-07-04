'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import StickyBottomNav from '../../components/layout/StickyBottomNav';
import VocabTab from '../../components/notebook/VocabTab';
import GrammarTab from '../../components/notebook/GrammarTab';
import { db, createSession } from '../../lib/db';

const LANG_FILTERS = [
  { code: 'all', label: 'Tất cả' },
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'ja', label: '🇯🇵 JA' },
];

export default function NotebookPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('vocab');
  const [langFilter, setLangFilter] = useState('all');
  const [selected, setSelected] = useState([]); // [{id, type, language, label}]
  const [starting, setStarting] = useState(false);

  const toggleSelect = (item) => {
    setSelected((prev) =>
      prev.some((s) => s.id === item.id) ? prev.filter((s) => s.id !== item.id) : [...prev, item]
    );
  };

  /** Tạo phiên luyện nói nhắm vào các mục đã chọn (cùng một ngôn ngữ). */
  const practiceSelected = async () => {
    if (!selected.length || starting) return;
    setStarting(true);
    try {
      const language = selected[0].language;
      const sameLang = selected.filter((s) => s.language === language);
      const id = await createSession({
        language,
        topic: 'Luyện tập từ sổ tay',
        practiceTargets: {
          vocab: sameLang.filter((s) => s.type === 'vocab').map((s) => s.label),
          grammar: sameLang.filter((s) => s.type === 'grammar').map((s) => s.label),
        },
      });
      router.push(`/chat?id=${id}`);
    } catch (err) {
      console.error('Không tạo được phiên luyện tập:', err);
      setStarting(false);
    }
  };

  const mixedLanguages = new Set(selected.map((s) => s.language)).size > 1;

  return (
    <div className="flex flex-col h-full relative">
      <header className="px-6 pt-8 pb-4 border-b border-slate-900/60 glassmorphism z-30">
        <h1 className="text-xl font-black text-white font-outfit tracking-tight">Sổ tay học tập</h1>
        <p className="text-[11px] text-slate-500 font-medium">
          Ngữ pháp và từ vựng được tự động ghi lại từ các buổi hội thoại
        </p>
      </header>

      {/* Tab + language filter */}
      <div className="px-6 pt-4 space-y-3 z-20">
        <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('vocab')}
            className={`flex-1 py-2.5 text-xs font-bold font-outfit rounded-lg transition-all relative z-10 cursor-pointer ${
              activeTab === 'vocab' ? 'text-white' : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            {activeTab === 'vocab' && (
              <span className="absolute inset-0 bg-indigo-600/10 border border-indigo-500/20 rounded-lg -z-10" />
            )}
            Từ vựng
          </button>
          <button
            onClick={() => setActiveTab('grammar')}
            className={`flex-1 py-2.5 text-xs font-bold font-outfit rounded-lg transition-all relative z-10 cursor-pointer ${
              activeTab === 'grammar' ? 'text-white' : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            {activeTab === 'grammar' && (
              <span className="absolute inset-0 bg-violet-600/10 border border-violet-500/20 rounded-lg -z-10" />
            )}
            Ngữ pháp
          </button>
        </div>

        <div className="flex gap-2">
          {LANG_FILTERS.map((f) => (
            <button
              key={f.code}
              onClick={() => setLangFilter(f.code)}
              className={`text-[10px] font-bold rounded-full px-3 py-1.5 border transition-all cursor-pointer ${
                langFilter === f.code
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-300'
                  : 'bg-slate-950/60 border-slate-900 text-slate-500 hover:text-slate-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-4 pb-44 overflow-y-auto no-scrollbar z-10">
        {activeTab === 'vocab' ? (
          <VocabTab langFilter={langFilter} selectedIds={selected.map((s) => s.id)} onToggleSelect={toggleSelect} />
        ) : (
          <GrammarTab langFilter={langFilter} selectedIds={selected.map((s) => s.id)} onToggleSelect={toggleSelect} />
        )}
      </div>

      {/* Practice bar */}
      {selected.length > 0 && (
        <div className="absolute bottom-20 inset-x-0 px-6 py-3.5 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-40">
          {mixedLanguages && (
            <p className="text-[9px] text-amber-500/90 mb-1.5 text-center font-bold">
              Bạn chọn cả 2 ngôn ngữ — buổi luyện sẽ chỉ dùng các mục {selected[0].language === 'ja' ? 'tiếng Nhật' : 'tiếng Anh'}.
            </p>
          )}
          <button
            onClick={practiceSelected}
            disabled={starting}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-between shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer animate-glow disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 animate-pulse">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
              {starting ? 'Đang tạo buổi luyện...' : 'Luyện nói với mục đã chọn'}
            </span>
            <span className="bg-white/20 px-2 py-0.5 rounded-lg font-bold text-[10px]">{selected.length}</span>
          </button>
        </div>
      )}

      <StickyBottomNav />
    </div>
  );
}
