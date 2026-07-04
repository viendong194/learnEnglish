'use client';

import React from 'react';

/** Nút micro — trạng thái điều khiển từ hook useSpeech ở trang cha. */
export default function VoiceRecordButton({ listening, supported, disabled, onPress }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled || !supported}
      title={listening ? 'Dừng thu âm' : 'Nhấn để nói'}
      className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shrink-0 ${
        listening
          ? 'bg-rose-500 shadow-[0_0_20px_5px_rgba(244,63,94,0.4)] pulse-recording'
          : 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {listening ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-white">
          <rect x="7" y="7" width="10" height="10" rx="2" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      )}
    </button>
  );
}
