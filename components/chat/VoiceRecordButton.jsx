'use client';

import React, { useState, useEffect } from 'react';

/**
 * Pulsing mic button that binds to browser's SpeechRecognition API.
 * Provides micro-animations and offline-ready speech-to-text.
 */
export default function VoiceRecordButton({ onTranscript, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event) => {
        const transcriptText = event.results[0][0].transcript;
        onTranscript(transcriptText);
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, [onTranscript]);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Safari.');
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      setIsRecording(true);
      recognition.start();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        onClick={toggleRecording}
        disabled={disabled}
        className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 relative ${
          isRecording
            ? 'bg-rose-500 shadow-[0_0_20px_5px_rgba(244,63,94,0.4)] pulse-recording'
            : 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 active:scale-95'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isRecording ? (
          // Recording wave icon
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-7 h-7 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Microphone icon
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-7 h-7 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mt-2">
        {isRecording ? 'Listening...' : 'Tap to speak'}
      </span>
    </div>
  );
}
