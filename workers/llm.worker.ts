import { CreateWebGPUEngine, WebGPUEngine } from '@mlc-ai/web-llm';

let engine: WebGPUEngine | null = null;

// Listen to message calls from the React UI thread
self.onmessage = async (event: MessageEvent) => {
  const { type, data } = event.data;

  if (type === 'init') {
    const { modelId } = data;
    console.log(`[Worker] Initializing WebGPU Engine for Model: ${modelId}`);

    try {
      engine = await CreateWebGPUEngine(
        modelId,
        {
          initProgressCallback: (report) => {
            // Forward download progress stats back to main hook
            self.postMessage({ type: 'progress', data: report });
          }
        }
      );
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      console.error('[Worker] WebGPU Engine initialization error:', err);
      self.postMessage({ type: 'error', data: err.message || 'Failed to initialize WebGPU engine.' });
    }
  }

  if (type === 'generate') {
    if (!engine) {
      self.postMessage({ type: 'error', data: 'Engine not initialized. Please load model first.' });
      return;
    }

    const { messages, systemPrompt } = data;
    console.log('[Worker] Executing WebGPU local inference...');

    try {
      const response = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 256
      });

      // Stream generated tokens back chunk-by-chunk to keep UI buttery smooth
      for await (const chunk of response) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          self.postMessage({ type: 'token', data: token });
        }
      }

      self.postMessage({ type: 'done' });
    } catch (err: any) {
      console.error('[Worker] Local inference exception:', err);
      self.postMessage({ type: 'error', data: err.message || 'Generation error.' });
    }
  }
};
