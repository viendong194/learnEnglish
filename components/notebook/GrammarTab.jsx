'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/db';

export default function GrammarTab({ langFilter, selectedIds, onToggleSelect }) {
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    let list = await db.grammar.orderBy('createdAt').reverse().toArray();
    if (langFilter !== 'all') list = list.filter((g) => g.language === langFilter);
    setItems(list);
  }, [langFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    await db.grammar.delete(id);
    load();
  };

  if (items === null) {
    return <p className="text-center text-xs text-slate-600 py-10">Đang tải...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <span className="text-3xl">📌</span>
        <p className="text-xs text-slate-500 leading-relaxed max-w-[240px] mx-auto">
          Chưa có điểm ngữ pháp nào. Trong lúc hội thoại, AI sẽ lồng ghép và lưu các cấu trúc hữu ích vào đây.
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
              isSelected ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => onToggleSelect({ id: item.id, type: 'grammar', language: item.language, label: item.name })}
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all ${
                  isSelected ? 'bg-violet-600 border-violet-500' : 'border-slate-700 hover:border-violet-500/50'
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
                  {item.name}
                  <span className="text-[10px] ml-1.5">{item.language === 'ja' ? '🇯🇵' : '🇬🇧'}</span>
                </p>
                {item.pattern && (
                  <p className="text-[11px] text-violet-300/90 font-mono mt-1 bg-slate-950/60 rounded-lg px-2 py-1 inline-block">
                    {item.pattern}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{item.explanationVi}</p>
                {item.example && <p className="text-[11px] text-slate-300 italic mt-1">“{item.example}”</p>}
                {item.source && <p className="text-[9px] text-slate-700 mt-1 truncate">Nguồn: {item.source}</p>}
              </div>

              <button
                onClick={() => handleDelete(item.id)}
                title="Xoá"
                className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-slate-950 transition-colors cursor-pointer shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
