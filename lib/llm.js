// Server-side LLM client kết nối trực tiếp với Google Gemini API (Google AI Studio).
// Chỉ dùng trong API routes — không import vào client.

// Model mặc định: Gemini 2.5 Flash — rẻ, nhanh, và là model duy nhất
// đọc được YouTube URL trực tiếp qua Google AI Studio.
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Chuyển đổi định dạng messages của OpenAI sang định dạng contents của Gemini API.
 */
function mapMessagesToGeminiContents(messages) {
  return messages.map((m) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    
    let parts = [];
    if (typeof m.content === 'string') {
      parts = [{ text: m.content }];
    } else if (Array.isArray(m.content)) {
      parts = m.content.map((item) => {
        if (item.type === 'text') {
          return { text: item.text };
        } else if (item.type === 'video_url') {
          // Gemini API nhận diện URL video YouTube trực tiếp qua fileUri
          return {
            fileData: {
              fileUri: item.video_url.url
            }
          };
        }
        return null;
      }).filter(Boolean);
    }
    
    return { role, parts };
  });
}

/**
 * Gọi Gemini API trực tiếp và parse JSON trả về theo JSON Schema (nếu có).
 * @param {object} opts
 * @param {string} [opts.system] - system prompt
 * @param {Array}  opts.messages - mảng messages chuẩn OpenAI (role + content)
 * @param {string} opts.schemaName - tên schema (bắt buộc với response_format json_schema)
 * @param {object} opts.schema - JSON Schema chuẩn cho structured output
 * @param {string} [opts.model] - override model cho request này
 */
export async function callLLM({ system, messages, schemaName, schema, model }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new LLMError(500, 'Chưa cấu hình GEMINI_API_KEY. Thêm key vào file .env.local (local) hoặc Environment Variables trên Vercel.');
  }

  // Chuẩn hóa tên model phù hợp với Google Gemini API
  let geminiModel = model || process.env.GEMINI_MODEL || process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  
  if (geminiModel.includes('/')) {
    geminiModel = geminiModel.split('/').pop();
  }
  if (geminiModel.includes(':')) {
    geminiModel = geminiModel.split(':').shift();
  }
  
  // Đảm bảo không trỏ nhầm sang model không tồn tại trên Google AI Studio
  if (!geminiModel.startsWith('gemini-')) {
    geminiModel = DEFAULT_MODEL;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

  const requestBody = {
    contents: mapMessagesToGeminiContents(messages),
    ...(system && {
      systemInstruction: {
        parts: [{ text: system }]
      }
    }),
    generationConfig: {
      temperature: 0.8,
      responseMimeType: schema ? 'application/json' : 'text/plain',
      ...(schema && { responseSchema: schema })
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new LLMError(401, 'Gemini API key không hợp lệ. Kiểm tra lại GEMINI_API_KEY.');
    }
    if (res.status === 429) {
      throw new LLMError(429, 'Đã chạm giới hạn rate limit của Gemini API. Chờ một lát rồi thử lại nhé.');
    }
    if (res.status === 400 || res.status === 403) {
      throw new LLMError(res.status, `Gemini từ chối yêu cầu (${res.status}). Kiểm tra API key hoặc quyền truy cập. Chi tiết: ${detail.slice(0, 300)}`);
    }
    throw new LLMError(res.status, `Lỗi Gemini API (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) {
    throw new LLMError(502, 'Gemini không trả về nội dung (video có thể quá dài hoặc bị chặn).');
  }

  if (schema) {
    try {
      // Một số model vẫn bọc JSON trong code fence dù đã yêu cầu structured output
      const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
      return JSON.parse(cleaned);
    } catch {
      throw new LLMError(502, 'Không parse được phản hồi JSON từ Gemini.');
    }
  }

  return text;
}

export class LLMError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const LANGUAGE_NAMES = {
  en: { name: 'English', vi: 'tiếng Anh', sttLocale: 'en-US' },
  ja: { name: 'Japanese', vi: 'tiếng Nhật', sttLocale: 'ja-JP' },
};
