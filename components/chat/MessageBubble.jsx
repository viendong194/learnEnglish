'use client';

import React, { useState } from 'react';

/**
 * Bong bóng tin nhắn: hỗ trợ 3 loại
 * - assistant: câu trả lời AI + nút nghe/dịch + ghi chú ngữ pháp/từ vựng vừa lưu + gợi ý trả lời
 * - user: câu của học viên + thẻ sửa lỗi (nếu có)
 * - video: thẻ tóm tắt video YouTube làm chủ đề
 */
export default function MessageBubble({ message, onSpeak }) {
  if (message.role === 'video') return <VideoTopicCard message={message} />;
  if (message.role === 'assistant') return <AssistantBubble message={message} onSpeak={onSpeak} />;
  return <UserBubble message={message} />;
}

function AssistantBubble({ message, onSpeak }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const hasNotes = message.savedGrammar?.length > 0 || message.savedVocab?.length > 0;

  return (
    <div className="flex flex-col items-start w-full my-2 gap-1.5">
      <div className="max-w-[88%] rounded-2xl rounded-tl-sm p-4 shadow-sm bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-900/60 text-slate-100">
        <p className="text-[13px] leading-relaxed">{message.text}</p>

        {showTranslation && message.translation && (
          <p className="text-[11px] leading-relaxed text-slate-400 mt-2 pt-2 border-t border-slate-800/60 italic">
            🇻🇳 {message.translation}
          </p>
        )}

        <div className="flex gap-3 mt-2.5">
          <button
            onClick={() => onSpeak?.(message.text)}
            className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
            Nghe
          </button>
          {message.translation && (
            <button
              onClick={() => setShowTranslation((v) => !v)}
              className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
            >
              {showTranslation ? 'Ẩn bản dịch' : 'Dịch'}
            </button>
          )}
          {message.suggestedReply && (
            <button
              onClick={() => setShowSuggestion((v) => !v)}
              className="text-[10px] font-bold text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
            >
              💡 Gợi ý trả lời
            </button>
          )}
        </div>
      </div>

      {showSuggestion && message.suggestedReply && (
        <div className="max-w-[88%] bg-amber-500/5 border border-amber-500/20 rounded-xl px-3.5 py-2.5">
          <p className="text-[9px] uppercase tracking-wider font-extrabold text-amber-500/80 mb-1">Bạn có thể nói</p>
          <p className="text-[12px] text-amber-100/90 leading-relaxed">{message.suggestedReply}</p>
        </div>
      )}

      {hasNotes && (
        <div className="max-w-[88%] space-y-1.5">
          {message.savedGrammar?.map((g) => (
            <div key={g.id} className="bg-violet-500/5 border border-violet-500/20 rounded-xl px-3.5 py-2.5">
              <p className="text-[9px] uppercase tracking-wider font-extrabold text-violet-400 mb-1">
                📌 Ngữ pháp mới · đã lưu vào sổ tay
              </p>
              <p className="text-[12px] font-bold text-violet-200">{g.name}</p>
              {g.pattern && <p className="text-[11px] text-violet-300/80 font-mono mt-0.5">{g.pattern}</p>}
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{g.explanationVi}</p>
              {g.example && <p className="text-[11px] text-slate-300 italic mt-1">“{g.example}”</p>}
            </div>
          ))}
          {message.savedVocab?.length > 0 && (
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl px-3.5 py-2.5">
              <p className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 mb-1.5">
                ✨ Từ mới · đã lưu vào sổ tay
              </p>
              <div className="space-y-1">
                {message.savedVocab.map((v) => (
                  <p key={v.id} className="text-[11px] text-slate-300 leading-relaxed">
                    <span className="font-bold text-indigo-200">{v.word}</span>
                    {v.reading && <span className="text-slate-500"> ({v.reading})</span>}
                    <span className="text-slate-400"> — {v.meaningVi}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserBubble({ message }) {
  return (
    <div className="flex flex-col items-end w-full my-2 gap-1.5 animate-fade-in">
      <div className="max-w-[88%] rounded-2xl rounded-tr-sm p-4 shadow-sm bg-indigo-600 text-white">
        <p className="text-[13px] leading-relaxed">{message.text}</p>
      </div>

      {message.correction && (
        <div className="max-w-[88%] bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3.5 py-2.5">
          <p className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400 mb-1">✏️ Nói tự nhiên hơn</p>
          <p className="text-[12px] leading-relaxed">
            <span className="text-slate-500 line-through">{message.correction.original}</span>
          </p>
          <p className="text-[12px] font-bold text-emerald-300 leading-relaxed mt-0.5">
            → {message.correction.corrected}
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{message.correction.explanationVi}</p>
        </div>
      )}
    </div>
  );
}

function VideoTopicCard({ message }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-full my-2 glassmorphism-card border border-rose-500/20 rounded-2xl p-4 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
            <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-black text-white leading-snug">{message.title}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{message.summaryVi}</p>
        </div>
      </div>

      {expanded && (
        <>
          <div>
            <p className="text-[9px] uppercase tracking-wider font-extrabold text-rose-400 mb-1">Ý chính để thảo luận</p>
            <ul className="space-y-0.5">
              {message.keyPoints?.map((p, i) => (
                <li key={i} className="text-[11px] text-slate-300 leading-relaxed">• {p}</li>
              ))}
            </ul>
          </div>
          {message.vocabPreview?.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 mb-1">
                Từ vựng chủ đề {message.savedCount > 0 && `(đã lưu ${message.savedCount} từ mới vào sổ tay)`}
              </p>
              <div className="space-y-0.5">
                {message.vocabPreview.map((v, i) => (
                  <p key={i} className="text-[11px] text-slate-300 leading-relaxed">
                    <span className="font-bold text-indigo-200">{v.word}</span>
                    {v.reading && <span className="text-slate-500"> ({v.reading})</span>}
                    <span className="text-slate-400"> — {v.meaningVi}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-[10px] font-bold text-rose-400/80 hover:text-rose-300 transition-colors cursor-pointer"
      >
        {expanded ? 'Thu gọn ▲' : 'Xem ý chính & từ vựng ▼'}
      </button>
    </div>
  );
}
