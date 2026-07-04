import { callGemini, GeminiError, LANGUAGE_NAMES } from '../../../lib/gemini';

export const maxDuration = 60;

const TOPIC_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: 'Tiêu đề video (giữ nguyên ngôn ngữ gốc).' },
    summaryVi: { type: 'STRING', description: 'Tóm tắt nội dung video bằng tiếng Việt, 2-3 câu.' },
    keyPoints: {
      type: 'ARRAY',
      description: '3-5 ý chính/khía cạnh của video có thể đem ra thảo luận, bằng tiếng Việt.',
      items: { type: 'STRING' },
    },
    vocabPreview: {
      type: 'ARRAY',
      description: '5-8 từ vựng đáng học liên quan đến chủ đề video, bằng ngôn ngữ học viên đang luyện.',
      items: {
        type: 'OBJECT',
        properties: {
          word: { type: 'STRING' },
          reading: { type: 'STRING', description: 'Hiragana nếu tiếng Nhật, IPA hoặc trống nếu tiếng Anh.' },
          meaningVi: { type: 'STRING' },
          example: { type: 'STRING' },
        },
        required: ['word', 'meaningVi'],
      },
    },
    openingQuestion: {
      type: 'STRING',
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
      'Hãy xem/đọc nội dung video và trả về đúng theo schema:',
      '- title: tiêu đề video.',
      '- summaryVi: tóm tắt tiếng Việt 2-3 câu.',
      '- keyPoints: 3-5 khía cạnh đáng thảo luận (tiếng Việt).',
      `- vocabPreview: 5-8 từ vựng ${lang.name} hữu ích liên quan chủ đề video (kể cả khi video không nói bằng ${lang.name}).`,
      `- openingQuestion: lời chào và câu hỏi mở đầu bằng ${lang.name}, thân thiện, dễ trả lời.`,
    ].join('\n');

    const result = await callGemini({
      contents: [
        {
          role: 'user',
          parts: [{ fileData: { fileUri: youtubeUrl } }, { text: prompt }],
        },
      ],
      responseSchema: TOPIC_SCHEMA,
    });

    return Response.json(result);
  } catch (err) {
    console.error('[api/topic]', err);
    const status = err instanceof GeminiError ? err.status : 500;
    return Response.json({ error: err.message || 'Lỗi máy chủ.' }, { status });
  }
}
