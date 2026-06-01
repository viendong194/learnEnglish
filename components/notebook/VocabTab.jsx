'use client';

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/dexie/db';
import { runSync } from '../../lib/supabase/sync';

export default function VocabTab({ selectedIds, onToggleSelect }) {
  const [vocabList, setVocabList] = useState([]);
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVocab();
  }, []);

  const loadVocab = async () => {
    try {
      setLoading(true);
      const items = await db.user_vocabulary.toArray();
      const activeItems = items.filter(i => !i.is_deleted && i.sync_status !== 'pending_delete');
      setVocabList(activeItems.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    } catch (err) {
      console.error('Failed to query vocabulary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async (e) => {
    e.preventDefault();
    if (!word || !translation) return;

    const newRecord = {
      id: crypto.randomUUID(),
      word_name: word,
      translation,
      status: 'learning', // Default starting status
      notes: notes || '',
      updated_at: new Date().toISOString(),
      sync_status: 'pending_insert',
      is_deleted: false,
    };

    try {
      await db.user_vocabulary.put(newRecord);
      setWord('');
      setTranslation('');
      setNotes('');
      await loadVocab();
      
      // Auto background sync
      runSync().then(() => loadVocab());
    } catch (err) {
      console.error('Failed to save vocabulary:', err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevent selection toggle when deleting
    try {
      const record = await db.user_vocabulary.get(id);
      if (record) {
        if (record.sync_status === 'pending_insert') {
          await db.user_vocabulary.delete(id);
        } else {
          await db.user_vocabulary.update(id, {
            is_deleted: true,
            sync_status: 'pending_delete',
            updated_at: new Date().toISOString(),
          });
        }
        await loadVocab();
        runSync().then(() => loadVocab());
      }
    } catch (err) {
      console.error('Deletion failure:', err);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Quick Add Form */}
      <form onSubmit={handleAddWord} className="glassmorphism-card rounded-xl p-4 border border-slate-900 space-y-3">
        <h4 className="text-xs font-extrabold text-indigo-400 font-outfit uppercase tracking-wider">Quick Add Vocabulary</h4>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            required
            placeholder="Word / Phrase"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            required
            placeholder="Translation"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <input
          type="text"
          placeholder="Usage Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-4 rounded-lg shadow-md transition-all active:scale-[0.97] cursor-pointer"
          >
            Save Offline
          </button>
        </div>
      </form>

      {/* Vocabulary List */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-500">Querying Dexie IndexedDB...</div>
        ) : vocabList.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-900 rounded-xl bg-slate-950/20">
            <p className="text-xs text-slate-500">No words stored offline yet.</p>
          </div>
        ) : (
          vocabList.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const isMastered = item.status === 'mastered';
            const isSynced = item.sync_status === 'synced';

            return (
              <div
                key={item.id}
                onClick={() => onToggleSelect(item.id)}
                className={`glassmorphism-card rounded-xl p-4 border transition-all duration-300 flex items-start gap-3 relative cursor-pointer ${
                  isSelected 
                    ? 'border-indigo-500/50 bg-indigo-950/10 shadow-[0_0_12px_rgba(99,102,241,0.1)]' 
                    : 'border-slate-900 hover:border-slate-800'
                }`}
              >
                {/* Selection Checkbox */}
                <div className="mt-1 flex items-center justify-center">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'bg-indigo-600 border-indigo-500 text-white' 
                      : 'border-slate-800 bg-slate-950/60'
                  }`}>
                    {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-2.5 h-2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-slate-100 font-outfit">{item.word_name}</h3>
                    
                    {/* Mastery Status Badge */}
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isMastered
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isMastered ? 'Mastered' : 'Practicing'}
                    </span>

                    {/* Sync Indicator Badge */}
                    <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isSynced
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'bg-slate-800 text-slate-500 border border-slate-900'
                    }`}>
                      {isSynced ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
                            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                          </svg>
                          Synced
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Offline
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-300 font-medium">{item.translation}</p>
                  {item.notes && <p className="text-[11px] text-slate-500 leading-relaxed">{item.notes}</p>}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="text-slate-600 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900/60 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
