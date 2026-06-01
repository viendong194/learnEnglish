'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StickyBottomNav from '../../components/layout/StickyBottomNav';
import MessageBubble from '../../components/chat/MessageBubble';
import VoiceRecordButton from '../../components/chat/VoiceRecordButton';
import { db } from '../../lib/dexie/db';
import { useLocalLLM } from '../../hooks/useLocalLLM';
import { useVoiceInterface } from '../../hooks/useVoiceInterface';
import { processUserResponse, generateSystemPrompt, TargetItem } from '../../lib/chat/logic';

// Wrap the main Chat layout inside Suspense to satisfy Next.js App Router rules for useSearchParams()
export default function ChatPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-xs text-slate-500">Initializing Chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your local WebGPU AI language tutor. Let\'s practice speaking and reinforce your notebook cards. Tap the mic below to start!',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [practiceIds, setPracticeIds] = useState<string[]>([]);
  const [targetItems, setTargetItems] = useState<TargetItem[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('You are LingoGlide AI, a helpful local language tutor.');
  const [unlockedUnlimited, setUnlockedUnlimited] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Initialize custom browser TTS/STT Hook
  const voice = useVoiceInterface({
    onTranscript: (text) => handleSendText(text),
    onError: (err) => console.error('[SpeechHook] Error:', err),
  });

  // 2. Initialize local on-device LLM Hook (WebGPU)
  const llm = useLocalLLM({
    onToken: () => {
      // Re-trigger scroll to follow stream chunk increases
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    },
    onDone: (fullText) => {
      // Add final completed assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullText,
        },
      ]);
      // Safely vocalize AI response, automatically stripping out [Correction: ...] tags
      voice.speak(fullText);
    },
  });

  // 3. Load targeted practice items passed from Notebook
  useEffect(() => {
    const practiceParam = searchParams.get('practice');
    if (practiceParam) {
      const ids = practiceParam.split(',');
      setPracticeIds(ids);
      loadPracticeData(ids);
    }
  }, [searchParams]);

  const loadPracticeData = async (ids: string[]) => {
    try {
      const targets: TargetItem[] = [];

      // Query checked vocabulary items from Dexie
      const vocabList = await db.user_vocabulary.where('id').anyOf(ids).toArray();
      vocabList.forEach((v) => {
        targets.push({ type: 'vocab', id: v.id, trigger: v.word_name });
      });

      // Query checked grammar topics from Dexie
      const grammarList = await db.user_grammar.where('id').anyOf(ids).toArray();
      grammarList.forEach((g) => {
        targets.push({ type: 'grammar', id: g.id, trigger: g.topic });
      });

      setTargetItems(targets);

      // Build personalized LLM system prompt dynamically
      const vocabTerms = vocabList.map(v => `"${v.word_name}"`).join(', ');
      const grammarTerms = grammarList.map(g => `"${g.topic}"`).join(', ');
      
      const customPrompt = `You are LingoGlide AI, a premium language conversation tutor.
The user is practicing specific targets today.
TARGET VOCABULARY TO ENCOURAGE: [ ${vocabTerms || 'None Selected'} ]
TARGET GRAMMAR RULES TO ENCOURAGE: [ ${grammarTerms || 'None Selected'} ]

INSTRUCTIONS:
1. Converse naturally in short mobile-friendly replies (2 sentences max).
2. Guide the conversation to help the user naturally use these target items.
3. If they correctly use an item, praise them! If they make a mistake, suggest corrections in [Correction: exact fix] format.`;

      setSystemPrompt(customPrompt);
    } catch (err) {
      console.error('Failed to construct practice prompts:', err);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, llm.streamedText]);

  // 4. Handle sending a message
  const handleSendText = async (text: string) => {
    if (!text.trim()) return;

    // Check voice quotas if using guest STT
    if (voice.quotaExceeded) {
      alert('Daily local voice limit reached! Please sign in to enjoy unlimited speech practice.');
      return;
    }

    const userMsgId = crypto.randomUUID();
    const userMessage = {
      id: userMsgId,
      role: 'user' as const,
      content: text,
      correction: '',
    };

    // Scan user's text for vocabulary/grammar matches
    const matches = await processUserResponse(text, targetItems);
    if (matches.length > 0) {
      // Add subtle correction tag if user made common mistakes (or simulate grammar review highlights)
      if (text.toLowerCase().includes('i has') || text.toLowerCase().includes('she like')) {
        userMessage.correction = text.toLowerCase().includes('i has') ? 'I have' : 'she likes';
      }
      console.log(`[Practice] Mastery detected for items: ${matches.join(', ')}`);
    }

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInputText('');

    // Format chat logs correctly for WebLLM engine schema
    const formattedHistory = updatedHistory
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Trigger on-device GPU inference streaming response
    llm.generateResponse(formattedHistory, systemPrompt);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Top Header */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between border-b border-slate-900/60 glassmorphism z-30">
        <div>
          <h1 className="text-xl font-black text-white font-outfit tracking-tight">AI Audio Partner</h1>
          <p className="text-[11px] text-slate-500 font-medium">On-Device WebGPU Model (SmolLM)</p>
        </div>

        {/* Dynamic Voice Quota Tag */}
        <div className="text-[9px] font-extrabold uppercase tracking-wider bg-slate-900/60 border border-slate-800 rounded-full px-2.5 py-1 text-slate-400">
          {voice.remainingAttempts === Infinity ? (
            'Unlimited Speech'
          ) : (
            `Guest: ${voice.remainingAttempts} Voice Runs Left`
          )}
        </div>
      </header>

      {/* Conditional Interface: Load / Downloader Box if model not active */}
      {llm.status !== 'ready' && llm.status !== 'generating' ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-6 pb-24">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-100 font-outfit">Local Offline AI Model</h2>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              We download a highly quantized model (~90MB) directly to your browser's private cache. All conversations are processed 100% on your device's GPU.
            </p>
          </div>

          {llm.status === 'loading' ? (
            <div className="w-full max-w-xs glassmorphism-card rounded-2xl p-5 border border-slate-900 space-y-3">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-extrabold text-indigo-400">
                <span>Model Loading...</span>
                <span>{llm.downloadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-300"
                  style={{ width: `${llm.downloadProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">
                {llm.progressText}
              </p>
            </div>
          ) : llm.status === 'unsupported' ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs max-w-xs">
              WebGPU is unsupported on this browser. Please try the latest version of Chrome, Edge, or Safari on iOS 18+.
            </div>
          ) : (
            <div className="space-y-3 w-full max-w-xs">
              {practiceIds.length > 0 && (
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-left text-slate-400 text-[11px] leading-relaxed">
                  <span className="font-bold text-indigo-400 block mb-0.5">Loaded targets from Notebook:</span>
                  {targetItems.map(t => t.trigger).join(', ')}
                </div>
              )}
              <button
                onClick={llm.loadModel}
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-xs py-3.5 px-4 rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Load Local Model (~90MB)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Conversation View */
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar pb-36"
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Stream token block for live local GPU output */}
            {llm.status === 'generating' && llm.streamedText && (
              <MessageBubble
                message={{
                  id: 'streaming-block',
                  role: 'assistant',
                  content: llm.streamedText,
                }}
              />
            )}

            {/* Waiting indicator */}
            {llm.status === 'generating' && !llm.streamedText && (
              <div className="flex justify-start">
                <div className="bg-slate-900/60 rounded-2xl rounded-tl-sm border border-slate-900/80 px-4 py-3 text-slate-500 text-xs italic animate-pulse">
                  AI GPU inference thinking...
                </div>
              </div>
            )}
          </div>

          {/* Bottom Speech and Input controls */}
          <div className="absolute bottom-20 inset-x-0 glassmorphism border-t border-slate-900 px-6 py-4 flex flex-col gap-3 z-30">
            <div className="flex gap-2 items-center bg-slate-950/60 border border-slate-900 rounded-xl p-1">
              <input
                type="text"
                placeholder={voice.isListening ? 'Listening to voice...' : 'Type message...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText(inputText)}
                disabled={llm.status === 'generating'}
                className="flex-1 bg-transparent border-0 text-slate-200 text-xs px-3 focus:outline-none focus:ring-0 placeholder-slate-600 disabled:opacity-50"
              />
              <button
                onClick={() => handleSendText(inputText)}
                disabled={llm.status === 'generating'}
                className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg text-white transition-all cursor-pointer active:scale-95 disabled:opacity-40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>

            {/* Pulsing Mic Triggers */}
            <div className="flex justify-center py-1">
              <VoiceRecordButton
                onTranscript={(text) => handleSendText(text)}
                disabled={llm.status === 'generating'}
              />
            </div>
          </div>
        </>
      )}

      {/* Tabs Menu */}
      <StickyBottomNav />
    </div>
  );
}
