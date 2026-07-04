'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/db';

const LOCALES = { en: 'en-US', ja: 'ja-JP' };

export default function VocabTab({ langFilter, selectedIds, onToggleSelect }) {
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    let list = await db.vocab.orderBy('createdAt').reverse().toArray();
    if (langFilter !== 'all') list = list.filter((v) => v.language === langFilter);
    setItems(list);
  }, [langFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    await db.vocab.delete(id);
    load();
  };

  const handleSpeak = (item) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(item.word);
    u.lang = LOCALES[item.language] || 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  if (items === null) {
    return <p className="text-center text-xs text-slate-600 py-10">Đang tải...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <span className="text-3xl">✨</span>
        <p className="text-xs text-slate-500 leading-relaxed max-w-[240px] mx-auto">
          Chưa có từ vựng nào. Bắt đầu một buổi hội thoại — từ mới sẽ tự động được lưu vào đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        return (
          <div
            key={item.id}
            className={`glassmorphism-card rounded-xl px-4 py-3 border transition-all ${
              isSelected ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => onToggleSelect({ id: item.id, type: 'vocab', language: item.language, label: item.word })}
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all ${
                  isSelected ? 'bg-indigo-600 border-indigo-500' : 'border-slate-700 hover:border-indigo-500/50'
                }`}
              >
                {isSelected && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3 h-3 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-100">
                  {item.word}
                  {item.reading && <span className="text-[11px] text-slate-500 font-normal ml-1.5">({item.reading})</span>}
                  <span className="text-[10px] ml-1.5">{item.language === 'ja' ? '🇯🇵' : '🇬🇧'}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.meaningVi}</p>
                {item.example && <p className="text-[11px] text-slate-500 italic mt-1">“{item.example}”</p>}
                {item.source && <p className="text-[9px] text-slate-700 mt-1 truncate">Nguồn: {item.source}</p>}
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => handleSpeak(item)}
                  title="Nghe phát âm"
                  className="p-1.5 text-slate-500 hover:text-indigo-400 rounded-lg hover:bg-slate-950 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  title="Xoá"
                  className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-slate-950 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
