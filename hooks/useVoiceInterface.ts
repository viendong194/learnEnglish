'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase/client';

export interface UseVoiceInterfaceOptions {
  locale?: string;
  onTranscript?: (text: string) => void;
  onError?: (error: any) => void;
}

export interface VoiceInterfaceState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  quotaExceeded: boolean;
  remainingAttempts: number;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
}

interface QuotaData {
  date: string;
  count: number;
}

const DAILY_LIMIT = 5;
const QUOTA_KEY = 'lingo_glide_speech_quota';

export function useVoiceInterface(options: UseVoiceInterfaceOptions = {}): VoiceInterfaceState {
  const { locale = 'en-US', onTranscript, onError } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(DAILY_LIMIT);

  const recognitionRef = useRef<any>(null);
  const isLoggedInRef = useRef(false);

  // 1. Check Authentication Status & Guest Quota Remaining Attempts
  const checkQuota = useCallback(async (): Promise<boolean> => {
    // Check Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    const isLoggedIn = !!session?.user;
    isLoggedInRef.current = isLoggedIn;

    if (isLoggedIn) {
      setQuotaExceeded(false);
      setRemainingAttempts(Infinity);
      return true; // Unlimited practice allowed
    }

    // Guest User: track quota locally
    if (typeof window === 'undefined') return false;

    const todayStr = new Date().toISOString().split('T')[0];
    const rawQuota = localStorage.getItem(QUOTA_KEY);
    let quota: QuotaData = { date: todayStr, count: 0 };

    if (rawQuota) {
      try {
        const parsed = JSON.parse(rawQuota) as QuotaData;
        if (parsed.date === todayStr) {
          quota = parsed;
        }
      } catch (e) {
        console.error('[Quota] Error parsing local storage quota, resetting keys', e);
      }
    }

    const remaining = Math.max(0, DAILY_LIMIT - quota.count);
    setRemainingAttempts(remaining);

    if (remaining <= 0) {
      setQuotaExceeded(true);
      return false; // Quota exceeded
    }

    setQuotaExceeded(false);
    return true; // Under quota
  }, []);

  // 2. Increment Guest Usage Count
  const incrementQuota = useCallback(async () => {
    if (isLoggedInRef.current) return; // Authenticated users have no quota limits

    if (typeof window === 'undefined') return;

    const todayStr = new Date().toISOString().split('T')[0];
    const rawQuota = localStorage.getItem(QUOTA_KEY);
    let quota: QuotaData = { date: todayStr, count: 0 };

    if (rawQuota) {
      try {
        const parsed = JSON.parse(rawQuota);
        if (parsed.date === todayStr) {
          quota = parsed;
        }
      } catch (e) {
        // ignore
      }
    }

    quota.count += 1;
    localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));

    const remaining = Math.max(0, DAILY_LIMIT - quota.count);
    setRemainingAttempts(remaining);
    if (remaining <= 0) {
      setQuotaExceeded(true);
    }
  }, []);

  // 3. Initialize SpeechRecognition API on client mount (SSR Safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = locale;

      rec.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      rec.onresult = async (event: any) => {
        const resultText = event.results[0][0].transcript;
        setTranscript(resultText);

        // Capture success: increment the quota count for guest users
        await incrementQuota();

        if (onTranscript) {
          onTranscript(resultText);
        }
      };

      rec.onerror = (event: any) => {
        console.error('[Speech] Error:', event);
        setIsListening(false);
        if (onError) {
          onError(event);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      setIsSupported(false);
      console.warn('[Speech] Web Speech API is not supported on this browser context.');
    }

    // Run initial quota checks on mount
    checkQuota();
  }, [locale, onTranscript, onError, checkQuota, incrementQuota]);

  // 4. Start Listening Control Handler
  const startListening = useCallback(async () => {
    if (!isSupported || !recognitionRef.current) {
      console.error('[Speech] Speech recognition is not supported or initialized.');
      return;
    }

    // Enforce quota restrictions before starting recording
    const isAllowed = await checkQuota();
    if (!isAllowed) {
      alert('Daily voice practice limit reached! Please sign in to enjoy unlimited AI audio conversation.');
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('[Speech] Recognition start exception:', e);
    }
  }, [isSupported, checkQuota]);

  // 5. Stop Listening Control Handler
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // 6. Text-to-Speech Vocalization
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('[Speech] TTS synthesis is not supported on this device.');
      return;
    }

    // Clean correction annotations (e.g. "[Correction: something]" pattern)
    // Supports brackets and braces formatting to prevent vocalizing structural notes
    const sanitizedText = text.replace(/\[Correction:[^\]]*\]/gi, '').trim();

    if (!sanitizedText) return;

    try {
      window.speechSynthesis.cancel(); // Cancel currently playing tracks
      const utterance = new SpeechSynthesisUtterance(sanitizedText);
      utterance.lang = locale;
      utterance.rate = 0.95; // Slightly tailored speed for clear pronunciation
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('[Speech] TTS vocalization exception:', e);
    }
  }, [locale]);

  return {
    isSupported,
    isListening,
    transcript,
    quotaExceeded,
    remainingAttempts,
    startListening,
    stopListening,
    speak,
  };
}
