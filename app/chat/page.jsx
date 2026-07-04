'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StickyBottomNav from '../../components/layout/StickyBottomNav';
import MessageBubble from '../../components/chat/MessageBubble';
import VoiceRecordButton from '../../components/chat/VoiceRecordButton';
import { db, updateSession, saveVocabItems, saveGrammarItems, getKnownItems } from '../../lib/db';
import { useSpeech } from '../../hooks/useSpeech';

const LOCALES = { en: 'en-US', ja: 'ja-JP' };

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-slate-500">Đang mở hội thoại...</div>}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('id');

  const [session, setSession] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);

  const scrollRef = useRef(null);
  const sessionRef = useRef(null);
  const messagesRef = useRef([]);
  const startedRef = useRef(false);

  const locale = LOCALES[session?.language] || 'en-US';

  const speech = useSpeech({
    locale,
    onTranscript: (text) => handleSend(text),
    onError: (e) => setError(`Lỗi thu âm: ${e.error || 'không xác định'}. Kiểm tra quyền micro của trình duyệt.`),
  });

  // Lưu tin nhắn vào state + IndexedDB
  const commitMessages = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(messagesRef.current) : updater;
    messagesRef.current = next;
    setMessages(next);
    if (sessionRef.current) {
      updateSession(sessionRef.current.id, { messages: next }).catch(console.error);
    }
    return next;
  }, []);

  // Nạp phiên hội thoại
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let s = null;
        if (sessionId) {
          s = await db.sessions.get(sessionId);
        } else {
          // Vào tab Hội thoại không kèm id → mở phiên gần nhất
          s = await db.sessions.orderBy('updatedAt').reverse().first();
          if (s) {
            router.replace(`/chat?id=${s.id}`);
            return;
          }
        }
        if (cancelled) return;
        if (!s) {
          setNotFound(true);
          return;
        }
        sessionRef.current = s;
        messagesRef.current = s.messages || [];
        setSession(s);
        setMessages(s.messages || []);
        setAutoSpeak(localStorage.getItem('tutor_autospeak') !== 'off');
      } catch (err) {
        console.error(err);
        setNotFound(true);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, router]);

  // Tự động mở đầu hội thoại khi phiên còn trống
  useEffect(() => {
    if (!session || startedRef.current) return;
    if ((session.messages || []).length > 0) return;
    startedRef.current = true;
    if (session.videoUrl && !session.videoContext) {
      startFromVideo(session);
    } else {
      requestAiTurn([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, speech.interimText]);

  /** Phân tích video YouTube → thẻ chủ đề + câu mở đầu */
  const startFromVideo = async (s) => {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: s.language, youtubeUrl: s.videoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không phân tích được video.');

      // Lưu từ vựng của video vào sổ tay
      const savedVocab = await saveVocabItems(data.vocabPreview, s.language, `Video: ${data.title}`);

      const videoContext = [
        `Tiêu đề: ${data.title}`,
        `Tóm tắt: ${data.summaryVi}`,
        `Các ý chính: ${data.keyPoints.join(' | ')}`,
      ].join('\n');

      sessionRef.current = { ...s, videoContext, videoTitle: data.title };
      setSession(sessionRef.current);
      await updateSession(s.id, { videoContext, videoTitle: data.title, topic: data.title });

      commitMessages([
        {
          id: crypto.randomUUID(),
          role: 'video',
          title: data.title,
          summaryVi: data.summaryVi,
          keyPoints: data.keyPoints,
          vocabPreview: data.vocabPreview,
          savedCount: savedVocab.length,
        },
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: data.openingQuestion,
          translation: '',
          suggestedReply: '',
          savedGrammar: [],
          savedVocab: [],
        },
      ]);
      if (autoSpeak) speech.speak(data.openingQuestion);
    } catch (err) {
      setError(err.message);
      startedRef.current = false;
    } finally {
      setSending(false);
    }
  };

  /** Gọi AI cho lượt tiếp theo (history đã gồm tin nhắn user mới nhất nếu có) */
  const requestAiTurn = async (history, userMsgId = null) => {
    const s = sessionRef.current;
    if (!s) return;
    setSending(true);
    setError('');
    try {
      const known = await getKnownItems(s.language);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: s.language,
          topic: s.videoTitle || s.topic,
          videoContext: s.videoContext || '',
          practiceTargets: s.practiceTargets || null,
          known,
          history: history.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI không phản hồi được.');

      const source = s.videoTitle || s.topic || '';
      const [savedGrammar, savedVocab] = await Promise.all([
        saveGrammarItems(data.grammarNotes, s.language, source),
        saveVocabItems(data.vocabNotes, s.language, source),
      ]);

      commitMessages((prev) => {
        let next = prev;
        // Gắn phần sửa lỗi vào tin nhắn user vừa gửi
        if (userMsgId && data.correction) {
          next = next.map((m) => (m.id === userMsgId ? { ...m, correction: data.correction } : m));
        }
        return [
          ...next,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: data.reply,
            translation: data.replyTranslation || '',
            suggestedReply: data.suggestedReply || '',
            savedGrammar,
            savedVocab,
          },
        ];
      });
      if (autoSpeak) speech.speak(data.reply);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSend = (rawText) => {
    const text = (rawText ?? inputText).trim();
    if (!text || sending || !sessionRef.current) return;
    setInputText('');
    const userMsg = { id: crypto.randomUUID(), role: 'user', text, correction: null };
    const next = commitMessages((prev) => [...prev, userMsg]);
    const history = next.filter((m) => m.role === 'user' || m.role === 'assistant');
    requestAiTurn(history, userMsg.id);
  };

  const toggleAutoSpeak = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    localStorage.setItem('tutor_autospeak', next ? 'on' : 'off');
    if (!next) speech.stopSpeaking();
  };

  const retryLastTurn = () => {
    const s = sessionRef.current;
    if (!s) return;
    setError('');
    const history = messagesRef.current.filter((m) => m.role === 'user' || m.role === 'assistant');
    if (history.length === 0 && s.videoUrl && !s.videoContext) {
      startFromVideo(s);
    } else {
      const last = history[history.length - 1];
      requestAiTurn(history, last?.role === 'user' ? last.id : null);
    }
  };

  if (notFound) {
    return (
      <div className="flex flex-col h-full relative">
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-4 pb-24">
          <span className="text-4xl">🎙️</span>
          <h2 className="text-lg font-black text-slate-100 font-outfit">Chưa có hội thoại nào</h2>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Về trang chủ để chọn ngôn ngữ và chủ đề (hoặc dán link YouTube) rồi bắt đầu nói nhé.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-xs py-3 px-6 rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Chọn chủ đề
          </button>
        </div>
        <StickyBottomNav />
      </div>
    );
  }

  if (!session) {
    return <div className="text-center py-20 text-xs text-slate-500">Đang mở hội thoại...</div>;
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <header className="px-5 pt-6 pb-3 flex items-center gap-3 border-b border-slate-900/60 glassmorphism z-30">
        <span className="text-xl shrink-0">{session.language === 'ja' ? '🇯🇵' : '🇬🇧'}</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-black text-white font-outfit truncate">
            {session.videoTitle || session.topic}
          </h1>
          <p className="text-[10px] text-slate-500 font-medium">
            {sending ? 'AI đang soạn câu trả lời...' : speech.listening ? 'Đang nghe bạn nói...' : 'Nói hoặc gõ để trả lời'}
          </p>
        </div>
        <button
          onClick={toggleAutoSpeak}
          title="Bật/tắt tự đọc câu trả lời"
          className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
            autoSpeak
              ? 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'
              : 'text-slate-600 border-slate-900 bg-slate-950/60'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
            {autoSpeak ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            )}
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar pb-44">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onSpeak={(text) => speech.speak(text)} />
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-900/60 rounded-2xl rounded-tl-sm border border-slate-900/80 px-4 py-3 text-slate-500 text-xs italic animate-pulse">
              {messages.length === 0 && session.videoUrl ? 'Đang xem video và chuẩn bị chủ đề...' : 'AI đang suy nghĩ...'}
            </div>
          </div>
        )}

        {speech.interimText && (
          <div className="flex justify-end">
            <div className="bg-indigo-600/40 rounded-2xl rounded-tr-sm px-4 py-3 text-white/80 text-xs italic max-w-[85%]">
              {speech.interimText}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
            <p className="text-rose-400 text-xs leading-relaxed">{error}</p>
            <button
              onClick={retryLastTurn}
              className="text-[10px] font-black uppercase tracking-wider text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-1.5 active:scale-95 transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="absolute bottom-20 inset-x-0 glassmorphism border-t border-slate-900 px-5 pt-3 pb-2 z-30">
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex gap-1 items-center bg-slate-950/60 border border-slate-900 rounded-xl p-1">
            <input
              type="text"
              placeholder={speech.listening ? 'Đang nghe...' : 'Hoặc gõ câu trả lời...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={sending}
              className="flex-1 min-w-0 bg-transparent border-0 text-slate-200 text-xs px-3 py-2 focus:outline-none placeholder-slate-600 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={sending || !inputText.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg text-white transition-all cursor-pointer active:scale-95 disabled:opacity-40 shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>

          <VoiceRecordButton
            listening={speech.listening}
            supported={speech.sttSupported}
            disabled={sending}
            onPress={() => (speech.listening ? speech.stopListening() : speech.startListening())}
          />
        </div>
        {!speech.sttSupported && (
          <p className="text-[9px] text-amber-500/80 mt-1.5 text-center">
            Trình duyệt này không hỗ trợ nhận diện giọng nói — hãy dùng Chrome (Android) hoặc Safari (iOS).
          </p>
        )}
      </div>

      <StickyBottomNav />
    </div>
  );
}
