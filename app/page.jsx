'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StickyBottomNav from '../components/layout/StickyBottomNav';
import { db, createSession } from '../lib/db';

const LANGUAGES = [
  { code: 'en', label: 'Tiếng Anh', flag: '🇬🇧' },
  { code: 'ja', label: 'Tiếng Nhật', flag: '🇯🇵' },
];

const SUGGESTED_TOPICS = {
  en: ['Giới thiệu bản thân', 'Công việc và dự án IT', 'Kế hoạch cuối tuần', 'Du lịch', 'Phim và âm nhạc', 'Phỏng vấn xin việc'],
  ja: ['Tự giới thiệu (自己紹介)', 'Công việc hàng ngày', 'Đồ ăn Nhật', 'Sở thích', 'Chuyện thời tiết', 'Kế hoạch du lịch Nhật'],
};

export default function HomePage() {
  const router = useRouter();
  const [language, setLanguage] = useState('en');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [freeTopic, setFreeTopic] = useState('');
  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState({ vocab: 0, grammar: 0 });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tutor_language');
    if (saved === 'en' || saved === 'ja') setLanguage(saved);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessions, vocabCount, grammarCount] = await Promise.all([
        db.sessions.orderBy('updatedAt').reverse().limit(4).toArray(),
        db.vocab.count(),
        db.grammar.count(),
      ]);
      setRecentSessions(sessions.filter((s) => s.messages?.length > 0));
      setStats({ vocab: vocabCount, grammar: grammarCount });
    } catch (err) {
      console.error('Không đọc được dữ liệu local:', err);
    }
  };

  const pickLanguage = (code) => {
    setLanguage(code);
    localStorage.setItem('tutor_language', code);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error('Đăng xuất thất bại:', err);
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  const startSession = async ({ topic, videoUrl }) => {
    if (starting) return;
    setStarting(true);
    try {
      const id = await createSession({
        language,
        topic: topic || 'Trò chuyện tự do',
        videoUrl: videoUrl || '',
      });
      router.push(`/chat?id=${id}`);
    } catch (err) {
      console.error('Không tạo được phiên hội thoại:', err);
      setStarting(false);
    }
  };

  const handleStartYoutube = () => {
    const url = youtubeUrl.trim();
    if (!url) return;
    startSession({ topic: 'Chủ đề từ video YouTube', videoUrl: url });
  };

  const handleStartFreeTopic = (topic) => {
    const t = (topic || freeTopic).trim();
    if (!t) return;
    startSession({ topic: t });
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-8 pb-28 space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white font-outfit tracking-tight">
              Hôm nay nói gì? 🎙️
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Chọn chủ đề rồi mở miệng nói thôi — AI sẽ trò chuyện, sửa lỗi và ghi chú giúp bạn.
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="shrink-0 p-2 rounded-xl border border-slate-900 bg-slate-950/60 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-all active:scale-95 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </header>

        {/* Language selector */}
        <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => pickLanguage(l.code)}
              className={`flex-1 py-2.5 text-xs font-bold font-outfit rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                language === l.code
                  ? 'bg-indigo-600/15 border border-indigo-500/30 text-white'
                  : 'text-slate-500 hover:text-slate-400 border border-transparent'
              }`}
            >
              <span className="text-sm">{l.flag}</span> {l.label}
            </button>
          ))}
        </div>

        {/* YouTube topic card */}
        <section className="glassmorphism-card rounded-2xl p-5 space-y-3 border border-slate-900">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-black text-white font-outfit">Nói theo video YouTube</h2>
              <p className="text-[10px] text-slate-500">AI xem video và dẫn dắt bạn thảo luận về nội dung đó</p>
            </div>
          </div>
          <input
            type="url"
            inputMode="url"
            placeholder="Dán link video YouTube bất kỳ..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
          />
          <button
            onClick={handleStartYoutube}
            disabled={!youtubeUrl.trim() || starting}
            className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black text-xs py-3 rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {starting ? 'Đang tạo...' : 'Tạo chủ đề từ video'}
          </button>
        </section>

        {/* Free topic card */}
        <section className="glassmorphism-card rounded-2xl p-5 space-y-3 border border-slate-900">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-black text-white font-outfit">Chủ đề tự chọn</h2>
              <p className="text-[10px] text-slate-500">Gõ chủ đề bất kỳ hoặc chọn gợi ý bên dưới</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ví dụ: kể về ngày hôm nay của bạn..."
              value={freeTopic}
              onChange={(e) => setFreeTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartFreeTopic()}
              className="flex-1 bg-slate-950/80 border border-slate-900 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
            />
            <button
              onClick={() => handleStartFreeTopic()}
              disabled={!freeTopic.trim() || starting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 rounded-xl active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            >
              Nói
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TOPICS[language].map((t) => (
              <button
                key={t}
                onClick={() => handleStartFreeTopic(t)}
                disabled={starting}
                className="text-[10px] font-bold text-slate-400 bg-slate-950/60 border border-slate-900 rounded-full px-3 py-1.5 hover:border-indigo-500/40 hover:text-indigo-300 active:scale-95 transition-all cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="glassmorphism-card rounded-2xl p-4 border border-slate-900">
            <p className="text-2xl font-black text-indigo-400 font-outfit">{stats.vocab}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Từ vựng đã lưu</p>
          </div>
          <div className="glassmorphism-card rounded-2xl p-4 border border-slate-900">
            <p className="text-2xl font-black text-violet-400 font-outfit">{stats.grammar}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Ngữ pháp đã lưu</p>
          </div>
        </section>

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="text-xs font-black text-slate-400 font-outfit uppercase tracking-wider">
              Tiếp tục hội thoại
            </h2>
            {recentSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/chat?id=${s.id}`)}
                className="w-full text-left glassmorphism-card rounded-xl px-4 py-3 border border-slate-900 hover:border-indigo-500/30 active:scale-[0.99] transition-all cursor-pointer flex items-center gap-3"
              >
                <span className="text-lg">{s.language === 'ja' ? '🇯🇵' : '🇬🇧'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{s.videoTitle || s.topic}</p>
                  <p className="text-[10px] text-slate-600">
                    {s.messages.length} tin nhắn · {new Date(s.updatedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 text-slate-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </section>
        )}
      </div>

      <StickyBottomNav />
    </div>
  );
}
