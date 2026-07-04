'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import StickyBottomNav from '../../components/layout/StickyBottomNav';
import { ROADMAP, topicId } from '../../lib/roadmap';
import { createSession, getCompletedTopicIds, setTopicComplete } from '../../lib/db';

export default function RoadmapPage() {
  const router = useRouter();
  const [language, setLanguage] = useState('en');
  const [trackKey, setTrackKey] = useState('general');
  const [completed, setCompleted] = useState(new Set());
  const [openLevel, setOpenLevel] = useState(null);
  const [starting, setStarting] = useState(false);

  const langData = ROADMAP[language];
  const track = langData.tracks.find((t) => t.key === trackKey) || langData.tracks[0];

  useEffect(() => {
    const saved = localStorage.getItem('tutor_language');
    if (saved === 'en' || saved === 'ja') setLanguage(saved);
  }, []);

  // Đổi ngôn ngữ thì reset về track đầu tiên hợp lệ
  useEffect(() => {
    if (!langData.tracks.some((t) => t.key === trackKey)) {
      setTrackKey(langData.tracks[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const loadProgress = useCallback(async () => {
    const ids = await getCompletedTopicIds(language, track.key);
    setCompleted(ids);
    // Mở sẵn level đầu tiên còn thiếu bài chưa hoàn thành
    const firstIncomplete = track.levels.find((lvl) =>
      lvl.topics.some((_, i) => !ids.has(topicId(language, track.key, lvl.id, i)))
    );
    setOpenLevel(firstIncomplete?.id ?? track.levels[0]?.id ?? null);
  }, [language, track]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const pickLanguage = (code) => {
    setLanguage(code);
    localStorage.setItem('tutor_language', code);
  };

  const toggleComplete = async (id, next) => {
    await setTopicComplete(language, track.key, id, next);
    setCompleted((prev) => {
      const s = new Set(prev);
      next ? s.add(id) : s.delete(id);
      return s;
    });
  };

  const practiceTopic = async (topic) => {
    if (starting) return;
    setStarting(true);
    try {
      const sessionId = await createSession({
        language,
        topic: `Ngữ pháp: ${topic.name}`,
        practiceTargets: { vocab: [], grammar: [topic] },
      });
      router.push(`/chat?id=${sessionId}`);
    } catch (err) {
      console.error('Không tạo được buổi luyện từ lộ trình:', err);
      setStarting(false);
    }
  };

  const overall = useMemo(() => {
    const total = track.levels.reduce((sum, lvl) => sum + lvl.topics.length, 0);
    return { total, done: completed.size };
  }, [track, completed]);

  return (
    <div className="flex flex-col h-full relative">
      <header className="px-6 pt-8 pb-4 border-b border-slate-900/60 glassmorphism z-30">
        <h1 className="text-xl font-black text-white font-outfit tracking-tight">Lộ trình ngữ pháp</h1>
        <p className="text-[11px] text-slate-500 font-medium">
          Đi từ cơ bản đến nâng cao — mỗi điểm ngữ pháp là một buổi luyện nói riêng
        </p>
      </header>

      <div className="px-6 pt-4 space-y-3 z-20">
        <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-1">
          {Object.entries(ROADMAP).map(([code, data]) => (
            <button
              key={code}
              onClick={() => pickLanguage(code)}
              className={`flex-1 py-2.5 text-xs font-bold font-outfit rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                language === code
                  ? 'bg-indigo-600/15 border border-indigo-500/30 text-white'
                  : 'text-slate-500 hover:text-slate-400 border border-transparent'
              }`}
            >
              <span className="text-sm">{data.flag}</span> {data.label}
            </button>
          ))}
        </div>

        {langData.tracks.length > 1 && (
          <div className="flex gap-2">
            {langData.tracks.map((t) => (
              <button
                key={t.key}
                onClick={() => setTrackKey(t.key)}
                className={`text-[10px] font-bold rounded-full px-3 py-1.5 border transition-all cursor-pointer ${
                  track.key === t.key
                    ? 'bg-violet-600/15 border-violet-500/30 text-violet-300'
                    : 'bg-slate-950/60 border-slate-900 text-slate-500 hover:text-slate-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1.5 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500"
              style={{ width: overall.total ? `${(overall.done / overall.total) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-500 shrink-0">{overall.done}/{overall.total}</span>
        </div>
      </div>

      <div className="flex-1 px-6 pt-4 pb-44 overflow-y-auto no-scrollbar z-10 space-y-3">
        {track.levels.map((level) => {
          const doneInLevel = level.topics.filter((_, i) => completed.has(topicId(language, track.key, level.id, i))).length;
          const isOpen = openLevel === level.id;
          const isLevelDone = doneInLevel === level.topics.length;

          return (
            <div key={level.id} className="glassmorphism-card rounded-2xl border border-slate-900 overflow-hidden">
              <button
                onClick={() => setOpenLevel(isOpen ? null : level.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isLevelDone
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    {isLevelDone ? '✓' : doneInLevel}
                  </span>
                  <span className="text-xs font-black text-slate-100 font-outfit text-left">{level.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-600 font-bold">{doneInLevel}/{level.topics.length}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"
                    className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-2.5 border-t border-slate-900/60 pt-3">
                  {level.topics.map((topic, i) => {
                    const id = topicId(language, track.key, level.id, i);
                    const isDone = completed.has(id);
                    return (
                      <div
                        key={id}
                        className={`rounded-xl px-3.5 py-3 border transition-all ${
                          isDone ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-900 bg-slate-950/40'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => toggleComplete(id, !isDone)}
                            title={isDone ? 'Bỏ đánh dấu' : 'Đánh dấu đã luyện xong'}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all ${
                              isDone ? 'bg-emerald-600 border-emerald-500' : 'border-slate-700 hover:border-emerald-500/50'
                            }`}
                          >
                            {isDone && (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3 h-3 text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-100">{topic.name}</p>
                            <p className="text-[11px] text-indigo-300/80 font-mono mt-1 bg-slate-950/60 rounded-lg px-2 py-1 inline-block">
                              {topic.pattern}
                            </p>
                            <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">{topic.explanationVi}</p>
                            <p className="text-[11px] text-slate-300 italic mt-1">“{topic.example}”</p>
                          </div>
                        </div>

                        <button
                          onClick={() => practiceTopic(topic)}
                          disabled={starting}
                          className="mt-2.5 w-full flex items-center justify-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 font-black text-[10px] uppercase tracking-wider py-2 rounded-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                          </svg>
                          Luyện nói điểm này
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <StickyBottomNav />
    </div>
  );
}
