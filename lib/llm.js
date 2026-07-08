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
 * Chuẩn hóa JSON Schema để tương thích với định dạng OpenAPI 3.0 Schema của Gemini API.
 * Gemini REST API không hỗ trợ additionalProperties và các kiểu kết hợp (union type như ['object', 'null']).
 */
function cleanSchemaForGemini(schema) {
  if (!schema || typeof schema !== 'object') return schema;

  const clean = { ...schema };

  // Loại bỏ additionalProperties vì Gemini REST API không nhận diện trường này
  delete clean.additionalProperties;

  // Xử lý các kiểu kết hợp ví dụ type: ['object', 'null']
  if (Array.isArray(clean.type)) {
    const types = clean.type;
    const hasNull = types.includes('null');
    const actualType = types.find((t) => t !== 'null');
    if (actualType) {
      clean.type = actualType;
    } else {
      clean.type = 'string';
    }
    if (hasNull) {
      clean.nullable = true;
    }
  }

  // Đệ quy làm sạch các thuộc tính (properties) bên trong
  if (clean.properties && typeof clean.properties === 'object') {
    const cleanedProps = {};
    for (const [key, prop] of Object.entries(clean.properties)) {
      cleanedProps[key] = cleanSchemaForGemini(prop);
    }
    clean.properties = cleanedProps;
  }

  // Đệ quy làm sạch mảng items
  if (clean.items && typeof clean.items === 'object') {
    clean.items = cleanSchemaForGemini(clean.items);
  }

  return clean;
}

/**
 * Danh sách API key theo thứ tự ưu tiên. Hỗ trợ nhiều key qua GEMINI_API_KEYS
 * (phân tách bằng dấu phẩy), hoặc 1 key duy nhất qua GEMINI_API_KEY (tương thích ngược).
 */
function getApiKeys() {
  const multi = process.env.GEMINI_API_KEYS;
  if (multi && multi.trim()) {
    return multi.split(',').map((k) => k.trim()).filter(Boolean);
  }
  const single = process.env.GEMINI_API_KEY;
  return single ? [single] : [];
}

// Lỗi liên quan đến bản thân key (sai key, hết quota, bị chặn) — đáng để thử key khác.
// Lỗi 400 do request/schema sai sẽ giống hệt nhau ở mọi key nên không đáng thử lại,
// NHƯNG Gemini lại trả API_KEY_INVALID kèm HTTP 400 (thay vì 401) nên phải kiểm tra thêm nội dung lỗi.
const RETRYABLE_STATUSES = new Set([401, 403, 429]);
const RETRYABLE_REASON_HINTS = /API_KEY_INVALID|UNAUTHENTICATED|PERMISSION_DENIED|RESOURCE_EXHAUSTED/i;

function isRetryableFailure(status, detail) {
  if (RETRYABLE_STATUSES.has(status)) return true;
  return RETRYABLE_REASON_HINTS.test(detail);
}

function buildStatusError(status, detail) {
  if (status === 401) return new LLMError(401, 'Gemini API key không hợp lệ. Kiểm tra lại GEMINI_API_KEY/GEMINI_API_KEYS.');
  if (status === 429) return new LLMError(429, 'Đã chạm giới hạn rate limit của Gemini API. Chờ một lát rồi thử lại nhé.');
  if (status === 400 || status === 403) return new LLMError(status, `Gemini từ chối yêu cầu (${status}). Kiểm tra API key hoặc quyền truy cập. Chi tiết: ${detail.slice(0, 300)}`);
  return new LLMError(status, `Lỗi Gemini API (${status}): ${detail.slice(0, 300)}`);
}

/**
 * Gọi Gemini API trực tiếp và parse JSON trả về theo JSON Schema (nếu có).
 * Tự động thử lần lượt các key trong GEMINI_API_KEYS nếu key hiện tại bị lỗi
 * (sai key/hết quota/bị chặn) — chỉ báo lỗi khi TOÀN BỘ key đều thất bại.
 * @param {object} opts
 * @param {string} [opts.system] - system prompt
 * @param {Array}  opts.messages - mảng messages chuẩn OpenAI (role + content)
 * @param {string} opts.schemaName - tên schema (bắt buộc với response_format json_schema)
 * @param {object} opts.schema - JSON Schema chuẩn cho structured output
 * @param {string} [opts.model] - override model cho request này
 */
export async function callLLM({ system, messages, schemaName, schema, model }) {
  const apiKeys = getApiKeys();
  if (!apiKeys.length) {
    throw new LLMError(500, 'Chưa cấu hình GEMINI_API_KEY (hoặc GEMINI_API_KEYS). Thêm key vào file .env.local (local) hoặc Environment Variables trên Vercel.');
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
      ...(schema && { responseSchema: cleanSchemaForGemini(schema) })
    }
  };

  let lastError = null;

  for (let i = 0; i < apiKeys.length; i++) {
    const isLastKey = i === apiKeys.length - 1;
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKeys[i],
        },
        body: JSON.stringify(requestBody),
      });
    } catch (networkErr) {
      lastError = new LLMError(503, `Không kết nối được tới Gemini API: ${networkErr.message}`);
      if (!isLastKey) {
        console.warn(`[llm] Key #${i + 1}/${apiKeys.length} lỗi mạng, thử key tiếp theo...`);
        continue;
      }
      throw lastError;
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const err = buildStatusError(res.status, detail);
      if (isRetryableFailure(res.status, detail) && !isLastKey) {
        console.warn(`[llm] Key #${i + 1}/${apiKeys.length} lỗi (${res.status}), thử key tiếp theo...`);
        lastError = err;
        continue;
      }
      throw err;
    }

    // Thành công — parse và trả về ngay, không cần thử các key còn lại
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

  throw lastError;
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
