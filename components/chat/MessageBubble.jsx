'use client';

import React from 'react';
import CorrectionOverlay from './CorrectionOverlay';

/**
 * Message Bubble displaying dialogue turns.
 * Integrates Web Speech Synthesis API for instant audio playback of AI messages.
 */
export default function MessageBubble({ message }) {
  const isAI = message.role === 'assistant';

  const handleSpeak = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel any existing speech
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // Slightly slower for better learning pronunciation
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Speech synthesis is not supported on this browser.');
    }
  };

  return (
    <div className={`flex w-full my-2 ${isAI ? 'justify-start' : 'justify-end animate-fade-in'}`}>
      <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm relative ${
        isAI
          ? 'bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-900/60 rounded-tl-sm text-slate-100'
          : 'bg-indigo-600 rounded-tr-sm text-white'
      }`}>
        
        {/* Play voice button on assistant messages */}
        {isAI && (
          <button
            onClick={handleSpeak}
            className="absolute top-2.5 right-2.5 text-slate-500 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-950 transition-colors cursor-pointer"
            title="Listen to pronunciation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          </button>
        )}

        {/* Message main text */}
        <p className={`text-xs leading-relaxed font-sans ${isAI ? 'pr-6' : ''}`}>
          {message.content}
        </p>

        {/* Correction Feedback (if provided) */}
        {!isAI && message.correction && (
          <div className="mt-3 pt-3 border-t border-indigo-500/30">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-200 block mb-1">
              Grammar Feedback
            </span>
            <CorrectionOverlay
              original={message.content}
              corrected={message.correction}
            />
          </div>
        )}
      </div>
    </div>
  );
}
