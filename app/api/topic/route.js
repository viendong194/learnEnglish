import { callLLM, LLMError, LANGUAGE_NAMES } from '../../../lib/llm';

export const maxDuration = 60;

// Chỉ Gemini (qua provider Google AI Studio) đọc được YouTube URL trực tiếp,
// nên route này luôn dùng model Gemini bất kể OPENROUTER_MODEL cấu hình gì.
const VIDEO_MODEL = process.env.OPENROUTER_VIDEO_MODEL || 'google/gemini-2.5-flash';

const TOPIC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', description: 'Tiêu đề video (giữ nguyên ngôn ngữ gốc).' },
    summaryVi: { type: 'string', description: 'Tóm tắt nội dung video bằng tiếng Việt, 2-3 câu.' },
    keyPoints: {
      type: 'array',
      description: '3-5 ý chính/khía cạnh của video có thể đem ra thảo luận, bằng tiếng Việt.',
      items: { type: 'string' },
    },
    vocabPreview: {
      type: 'array',
      description: '5-8 từ vựng đáng học liên quan đến chủ đề video, bằng ngôn ngữ học viên đang luyện.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          word: { type: 'string' },
          reading: { type: 'string', description: 'Hiragana nếu tiếng Nhật, IPA nếu tiếng Anh. Để chuỗi rỗng nếu không có.' },
          meaningVi: { type: 'string' },
          example: { type: 'string', description: 'Câu ví dụ, để chuỗi rỗng nếu không có.' },
        },
        required: ['word', 'reading', 'meaningVi', 'example'],
      },
    },
    openingQuestion: {
      type: 'string',
      description: 'Lời chào + câu hỏi mở đầu hội thoại về video, bằng ngôn ngữ đang luyện, 2-3 câu thân thiện.',
    },
  },
  required: ['title', 'summaryVi', 'keyPoints', 'vocabPreview', 'openingQuestion'],
};

function isYoutubeUrl(url) {
  try {
    const u = new URL(url);
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(u.hostname);
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const { language, youtubeUrl } = await request.json();

    if (!LANGUAGE_NAMES[language]) {
      return Response.json({ error: 'Ngôn ngữ không hợp lệ.' }, { status: 400 });
    }
    if (!youtubeUrl || !isYoutubeUrl(youtubeUrl)) {
      return Response.json({ error: 'Link YouTube không hợp lệ. Dán link dạng youtube.com/watch?v=... hoặc youtu.be/...' }, { status: 400 });
    }

    const lang = LANGUAGE_NAMES[language];
    const prompt = [
      `Học viên người Việt muốn luyện nói ${lang.vi} (${lang.name}) dựa trên nội dung video YouTube này.`,
      'Hãy xem/đọc nội dung video và trả về JSON đúng theo schema:',
      '- title: tiêu đề video.',
      '- summaryVi: tóm tắt tiếng Việt 2-3 câu.',
      '- keyPoints: 3-5 khía cạnh đáng thảo luận (tiếng Việt).',
      `- vocabPreview: 5-8 từ vựng ${lang.name} hữu ích liên quan chủ đề video (kể cả khi video không nói bằng ${lang.name}).`,
      `- openingQuestion: lời chào và câu hỏi mở đầu bằng ${lang.name}, thân thiện, dễ trả lời.`,
      '',
      `QUY TẮC BẮT BUỘC: "openingQuestion" phải viết 100% bằng ${lang.name}, TUYỆT ĐỐI KHÔNG chèn từ hay cụm từ tiếng Việt vào giữa câu. Nếu khó diễn đạt, dùng từ ${lang.name} đơn giản hơn thay vì chuyển ngôn ngữ giữa chừng.`,
    ].join('\n');

    const result = await callLLM({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'video_url', video_url: { url: youtubeUrl } },
          ],
        },
      ],
      schemaName: 'video_topic',
      schema: TOPIC_SCHEMA,
      model: VIDEO_MODEL,
      // Google AI Studio là provider duy nhất nhận YouTube URL trực tiếp (Vertex yêu cầu base64)
      provider: { only: ['google-ai-studio'] },
    });

    return Response.json(result);
  } catch (err) {
    console.error('[api/topic]', err);
    const status = err instanceof LLMError ? err.status : 500;
    return Response.json({ error: err.message || 'Lỗi máy chủ.' }, { status });
  }
}
