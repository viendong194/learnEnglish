// Server-side Gemini client (chỉ dùng trong API routes — không import vào client).

const MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * Gọi Gemini và parse JSON trả về theo responseSchema.
 * @param {object} opts
 * @param {string} opts.systemInstruction
 * @param {Array}  opts.contents - mảng contents chuẩn Gemini API
 * @param {object} opts.responseSchema - JSON schema cho structured output
 */
export async function callGemini({ systemInstruction, contents, responseSchema }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError(500, 'Chưa cấu hình GEMINI_API_KEY. Thêm key vào file .env.local (local) hoặc Environment Variables trên Vercel.');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents,
      ...(systemInstruction && {
        systemInstruction: { parts: [{ text: systemInstruction }] },
      }),
      generationConfig: {
        temperature: 0.8,
        responseMimeType: 'application/json',
        responseSchema,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    if (res.status === 429) {
      throw new GeminiError(429, 'Đã chạm giới hạn free tier của Gemini. Chờ một lát rồi thử lại nhé.');
    }
    if (res.status === 400 || res.status === 403) {
      throw new GeminiError(res.status, `Gemini từ chối yêu cầu (${res.status}). Kiểm tra API key hoặc video có công khai không. ${detail.slice(0, 300)}`);
    }
    throw new GeminiError(res.status, `Lỗi Gemini API (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) {
    throw new GeminiError(502, 'Gemini không trả về nội dung (video có thể quá dài hoặc bị chặn).');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError(502, 'Không parse được phản hồi JSON từ Gemini.');
  }
}

export class GeminiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const LANGUAGE_NAMES = {
  en: { name: 'English', vi: 'tiếng Anh', sttLocale: 'en-US' },
  ja: { name: 'Japanese', vi: 'tiếng Nhật', sttLocale: 'ja-JP' },
};
