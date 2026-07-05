// Server-side LLM client qua OpenRouter (chỉ dùng trong API routes — không import vào client).
// OpenRouter dùng API chuẩn OpenAI chat completions, cho phép đổi model qua env mà không sửa code.

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model mặc định: Gemini Flash qua OpenRouter — rẻ, nhanh, và là model duy nhất
// đọc được YouTube URL trực tiếp (qua provider Google AI Studio).
const DEFAULT_MODEL = 'google/gemini-2.5-flash';

/**
 * Gọi OpenRouter và parse JSON trả về theo JSON Schema.
 * @param {object} opts
 * @param {string} [opts.system] - system prompt
 * @param {Array}  opts.messages - mảng messages chuẩn OpenAI (role + content)
 * @param {string} opts.schemaName - tên schema (bắt buộc với response_format json_schema)
 * @param {object} opts.schema - JSON Schema chuẩn cho structured output
 * @param {string} [opts.model] - override model cho request này
 * @param {object} [opts.provider] - tuỳ chọn routing provider của OpenRouter
 */
export async function callLLM({ system, messages, schemaName, schema, model, provider }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new LLMError(500, 'Chưa cấu hình OPENROUTER_API_KEY. Thêm key vào file .env.local (local) hoặc Environment Variables trên Vercel.');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Title': 'Noi Di - Language Tutor',
    },
    body: JSON.stringify({
      model: model || process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages,
      ],
      temperature: 0.8,
      response_format: {
        type: 'json_schema',
        json_schema: { name: schemaName, strict: true, schema },
      },
      ...(provider && { provider }),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new LLMError(401, 'OpenRouter API key không hợp lệ. Kiểm tra lại OPENROUTER_API_KEY.');
    }
    if (res.status === 402) {
      throw new LLMError(402, 'Tài khoản OpenRouter hết credit. Nạp thêm tại openrouter.ai/credits hoặc đổi sang model miễn phí (OPENROUTER_MODEL=...:free).');
    }
    if (res.status === 429) {
      throw new LLMError(429, 'Đã chạm giới hạn rate limit của OpenRouter/model. Chờ một lát rồi thử lại nhé.');
    }
    throw new LLMError(res.status, `Lỗi OpenRouter API (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  // OpenRouter đôi khi trả lỗi provider trong body 200
  if (data.error) {
    throw new LLMError(502, `Provider báo lỗi: ${data.error.message || JSON.stringify(data.error).slice(0, 300)}`);
  }

  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) {
    throw new LLMError(502, 'Model không trả về nội dung (video có thể quá dài hoặc bị chặn).');
  }

  try {
    // Một số model bọc JSON trong code fence dù đã yêu cầu structured output
    const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    return JSON.parse(cleaned);
  } catch {
    throw new LLMError(502, 'Không parse được phản hồi JSON từ model.');
  }
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
