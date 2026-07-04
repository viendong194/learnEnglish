'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Nhận diện giọng nói (STT) + đọc to (TTS) qua Web Speech API.
 * @param {object} opts
 * @param {string} opts.locale - 'en-US' | 'ja-JP'
 * @param {(text: string) => void} opts.onTranscript
 * @param {(err: any) => void} [opts.onError]
 */
export function useSpeech({ locale, onTranscript, onError }) {
  const [sttSupported, setSttSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const callbacksRef = useRef({ onTranscript, onError });
  callbacksRef.current = { onTranscript, onError };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSttSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = locale;
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => {
      setListening(true);
      setInterimText('');
    };
    rec.onresult = (event) => {
      let finalText = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInterimText(interim);
      if (finalText.trim()) {
        setInterimText('');
        callbacksRef.current.onTranscript?.(finalText.trim());
      }
    };
    rec.onerror = (event) => {
      setListening(false);
      setInterimText('');
      // 'no-speech' và 'aborted' là tình huống bình thường, không cần báo lỗi
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        callbacksRef.current.onError?.(event);
      }
    };
    rec.onend = () => {
      setListening(false);
      setInterimText('');
    };

    recognitionRef.current = rec;
    return () => {
      try { rec.abort(); } catch {}
      recognitionRef.current = null;
    };
  }, [locale]);

  const startListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    // Đang phát TTS thì dừng để tránh mic thu tiếng máy
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeaking(false);
    try { rec.start(); } catch {} // start() ném lỗi nếu đang chạy — bỏ qua
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  const speak = useCallback((text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = locale;
    utter.rate = 0.95;

    // Ưu tiên voice khớp ngôn ngữ (một số thiết bị mặc định voice sai lang)
    const voices = synth.getVoices();
    const match =
      voices.find((v) => v.lang === locale) ||
      voices.find((v) => v.lang?.startsWith(locale.split('-')[0]));
    if (match) utter.voice = match;

    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synth.speak(utter);
  }, [locale]);

  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeaking(false);
  }, []);

  return { sttSupported, listening, interimText, speaking, startListening, stopListening, speak, stopSpeaking };
}
