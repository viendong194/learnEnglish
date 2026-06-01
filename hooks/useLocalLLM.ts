'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type LLMStatus = 'idle' | 'unsupported' | 'loading' | 'ready' | 'generating' | 'error';

export interface UseLocalLLMOptions {
  modelId?: string;
  onDone?: (fullText: string) => void;
  onToken?: (token: string) => void;
  onError?: (error: string) => void;
}

export function useLocalLLM(options: UseLocalLLMOptions = {}) {
  const { 
    modelId = 'SmolLM-135M-Instruct-q4f16_1-MLC',
    onDone,
    onToken,
    onError 
  } = options;

  const [status, setStatus] = useState<LLMStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const workerRef = useRef<Worker | null>(null);
  const accumTextRef = useRef('');

  // 1. Initialize Worker & Check WebGPU Support
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if browser supports WebGPU
    if (!(navigator as any).gpu) {
      setStatus('unsupported');
      console.warn('[LocalLLM] WebGPU is not supported on this browser context.');
      return;
    }

    // Spawn the background worker dynamically using Next.js worker bundling
    const worker = new Worker(new URL('../workers/llm.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      if (type === 'progress') {
        // data has properties: progress (number 0-1), text (string description)
        const percent = Math.round((data.progress || 0) * 100);
        setDownloadProgress(percent);
        setProgressText(data.text || `Downloading model... ${percent}%`);
      }

      else if (type === 'ready') {
        setStatus('ready');
        setProgressText('Model is fully loaded and ready on GPU!');
      }

      else if (type === 'token') {
        accumTextRef.current += data;
        setStreamedText(accumTextRef.current);
        if (onToken) onToken(data);
      }

      else if (type === 'done') {
        setStatus('ready');
        if (onDone) onDone(accumTextRef.current);
      }

      else if (type === 'error') {
        setStatus('error');
        setErrorMessage(data);
        if (onError) onError(data);
      }
    };

    workerRef.current = worker;

    // Cleanup worker thread on component unmount to free VRAM
    return () => {
      worker.terminate();
      console.log('[LocalLLM] Background worker terminated.');
    };
  }, [onDone, onToken, onError]);

  // 2. Load Selected Model
  const loadModel = useCallback(() => {
    if (!workerRef.current) {
      if (status === 'unsupported') {
        alert('WebGPU is not supported on this browser. Try Chrome/Safari 18+.');
      }
      return;
    }

    setStatus('loading');
    setDownloadProgress(0);
    setProgressText('Spawning background WebGPU worker...');
    
    workerRef.current.postMessage({
      type: 'init',
      data: { modelId }
    });
  }, [modelId, status]);

  // 3. Generate Response
  const generateResponse = useCallback((messages: { role: 'user' | 'assistant'; content: string }[], systemPrompt: string) => {
    if (!workerRef.current || status !== 'ready') {
      console.error('[LocalLLM] Local model is not loaded or ready.');
      return;
    }

    setStatus('generating');
    setStreamedText('');
    accumTextRef.current = '';

    workerRef.current.postMessage({
      type: 'generate',
      data: { messages, systemPrompt }
    });
  }, [status]);

  return {
    status,
    downloadProgress,
    progressText,
    streamedText,
    errorMessage,
    loadModel,
    generateResponse
  };
}
