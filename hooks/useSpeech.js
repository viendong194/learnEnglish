'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Nhận diện giọng nói (STT) + đọc to (TTS) qua Web Speech API.
 * @param {object} opts
 * @param {string} opts.locale - 'en-US' | 'ja-JP'
 * @param {(text: string) => void} opts.onTranscript
 * @param {(err: any) => void} [opts.onError]
 */
// Từ khoá nhận diện giọng chất lượng cao (giọng mạng/neural), phổ biến trên Android Chrome & Windows Edge
const HQ_HINTS = /google|neural|wavenet|natural|enhanced|premium|online/i;
// Giọng "Compact" trên iOS/macOS là giọng nén chất lượng thấp, robot hơn hẳn giọng mặc định
const LQ_HINTS = /compact/i;
// macOS/iOS cài sẵn một loạt giọng "vui" (hiệu ứng âm thanh, hài hước) lẫn vào danh sách giọng đọc —
// nghe rất máy móc/kỳ quặc nếu vô tình bị chọn, nên loại hẳn khỏi lựa chọn tự động
const NOVELTY_BLOCKLIST = new Set([
  'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Good News',
  'Jester', 'Junior', 'Organ', 'Ralph', 'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox',
]);
// Giọng mặc định quen thuộc, chất lượng ổn định trên iOS/macOS — ưu tiên nhẹ khi không có giọng "network" tốt hơn
const PREFERRED_NAMES = new Set(['Samantha', 'Kyoko']);

/** Bỏ hậu tố ngôn ngữ trong ngoặc, ví dụ "Eddy (Tiếng Nhật (Nhật Bản))" -> "Eddy" */
function baseVoiceName(name) {
  return name.replace(/\s*\(.*\)\s*$/, '').trim();
}

/** Chấm điểm và chọn giọng đọc tự nhiên nhất khớp locale trong số các giọng máy đã cài. */
function pickBestVoice(voices, locale) {
  const lang = locale.split('-')[0];
  const candidates = voices.filter((v) => v.lang === locale || v.lang?.startsWith(lang));
  if (!candidates.length) return null;

  const score = (v) => {
    const base = baseVoiceName(v.name);
    let s = v.lang === locale ? 3 : 1;
    if (HQ_HINTS.test(v.name)) s += 5;
    if (LQ_HINTS.test(v.name)) s -= 5;
    if (NOVELTY_BLOCKLIST.has(base)) s -= 8;
    if (PREFERRED_NAMES.has(base)) s += 2;
    if (v.localService === false) s += 2; // giọng chạy qua mạng thường tự nhiên hơn giọng cài sẵn trên máy
    return s;
  };

  return candidates.sort((a, b) => score(b) - score(a))[0];
}

export function useSpeech({ locale, onTranscript, onError }) {
  const [sttSupported, setSttSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const voicesRef = useRef([]);
  // Transcript đã chốt qua các "chu kỳ" ghi âm trước đó (xem giải thích continuous bên dưới)
  const sessionTextRef = useRef('');
  // Final/interim của CHU KỲ hiện tại — event.results được trình duyệt reset về rỗng mỗi lần rec.start()
  const cycleFinalRef = useRef('');
  const cycleInterimRef = useRef('');
  // true = người dùng đã chủ động bấm dừng; false = mic tự dừng do trình duyệt đoán im lặng, cần âm thầm khởi động lại
  const manualStopRef = useRef(true);
  const callbacksRef = useRef({ onTranscript, onError });
  callbacksRef.current = { onTranscript, onError };

  // Danh sách giọng đọc thường nạp bất đồng bộ (rỗng cho tới khi 'voiceschanged' bắn ra)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const loadVoices = () => { voicesRef.current = synth.getVoices(); };
    loadVoices();
    synth.addEventListener('voiceschanged', loadVoices);
    return () => synth.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSttSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = locale;
    // continuous=true rất chập chờn trên Chrome Android (tự dừng sau vài giây im lặng, đôi khi
    // lặp lại cả câu vừa nói khi trình duyệt "restart" ngầm). Dùng continuous=false ổn định hơn,
    // và tự khởi động lại ở onend nếu người dùng CHƯA chủ động bấm dừng — mô phỏng ghi âm liên tục
    // mà không dính lỗi của continuous=true.
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => {
      // Chỉ reset dữ liệu của chu kỳ hiện tại — sessionTextRef (nội dung các chu kỳ trước) phải giữ nguyên
      cycleFinalRef.current = '';
      cycleInterimRef.current = '';
      setListening(true);
    };
    rec.onresult = (event) => {
      // event.results chỉ chứa nội dung của CHU KỲ hiện tại (trình duyệt reset khi start() lại)
      let finalText = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      cycleFinalRef.current = finalText;
      cycleInterimRef.current = interim;
      // Hiển thị: những gì đã chốt ở các chu kỳ trước + nội dung đang nói ở chu kỳ này
      const preview = [sessionTextRef.current, finalText, interim].filter(Boolean).join(' ');
      setInterimText(preview);
    };
    rec.onerror = (event) => {
      // 'no-speech' và 'aborted' là tình huống bình thường (kể cả khi tự khởi động lại), không cần báo lỗi
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        callbacksRef.current.onError?.(event);
      }
    };
    rec.onend = () => {
      // Gộp nội dung chu kỳ vừa kết thúc vào transcript tổng của cả phiên
      const cycleText = (cycleFinalRef.current + ' ' + cycleInterimRef.current).trim();
      if (cycleText) {
        sessionTextRef.current = sessionTextRef.current ? `${sessionTextRef.current} ${cycleText}` : cycleText;
      }
      cycleFinalRef.current = '';
      cycleInterimRef.current = '';

      if (manualStopRef.current) {
        // Người dùng đã bấm dừng — kết thúc phiên nghe thật sự, gửi toàn bộ transcript đã gom
        setListening(false);
        setInterimText('');
        const finalText = sessionTextRef.current.trim();
        sessionTextRef.current = '';
        if (finalText) callbacksRef.current.onTranscript?.(finalText);
      } else {
        // Trình duyệt tự dừng do đoán im lặng nhưng người dùng chưa bấm dừng — âm thầm nghe lại ngay
        try { rec.start(); } catch { setListening(false); }
      }
    };

    recognitionRef.current = rec;
    return () => {
      manualStopRef.current = true;
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
    manualStopRef.current = false;
    sessionTextRef.current = '';
    setInterimText('');
    try { rec.start(); } catch {} // start() ném lỗi nếu đang chạy — bỏ qua
  }, []);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  const speak = useCallback((text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = locale;
    utter.rate = 0.95;

    // Ưu tiên giọng tự nhiên nhất khớp ngôn ngữ (một số thiết bị mặc định voice sai lang hoặc chọn giọng robot)
    const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
    const match = pickBestVoice(voices, locale);
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
