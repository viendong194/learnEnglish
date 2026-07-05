import { callLLM, LLMError, LANGUAGE_NAMES } from '../../../lib/llm';

export const maxDuration = 60;

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: {
      type: 'string',
      description: 'Câu trả lời hội thoại bằng ngôn ngữ đang học (2-3 câu, kết thúc bằng câu hỏi).',
    },
    replyTranslation: {
      type: 'string',
      description: 'Bản dịch tiếng Việt của reply.',
    },
    correction: {
      type: ['object', 'null'],
      description: 'Sửa lỗi cho tin nhắn gần nhất của học viên. null nếu câu đã tự nhiên và đúng.',
      additionalProperties: false,
      properties: {
        original: { type: 'string' },
        corrected: { type: 'string' },
        explanationVi: { type: 'string', description: 'Giải thích ngắn gọn bằng tiếng Việt vì sao sửa như vậy.' },
      },
      required: ['original', 'corrected', 'explanationVi'],
    },
    grammarNotes: {
      type: 'array',
      description: 'Tối đa 1 điểm ngữ pháp mới vừa được dùng trong hội thoại, đáng lưu vào sổ tay. Mảng rỗng nếu không có gì mới.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', description: 'Tên điểm ngữ pháp, ví dụ "Thì hiện tại hoàn thành" hoặc "〜たことがある".' },
          pattern: { type: 'string', description: 'Công thức/cấu trúc.' },
          explanationVi: { type: 'string', description: 'Giải thích bằng tiếng Việt.' },
          example: { type: 'string', description: 'Một câu ví dụ bằng ngôn ngữ đang học.' },
        },
        required: ['name', 'pattern', 'explanationVi', 'example'],
      },
    },
    vocabNotes: {
      type: 'array',
      description: 'Tối đa 3 từ/cụm từ hữu ích xuất hiện trong reply mà học viên có thể chưa biết. Mảng rỗng nếu không có.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          word: { type: 'string' },
          reading: { type: 'string', description: 'Với tiếng Nhật: cách đọc hiragana. Với tiếng Anh: phiên âm IPA. Để chuỗi rỗng nếu không có.' },
          meaningVi: { type: 'string' },
          example: { type: 'string', description: 'Câu ví dụ, để chuỗi rỗng nếu không có.' },
        },
        required: ['word', 'reading', 'meaningVi', 'example'],
      },
    },
    suggestedReply: {
      type: 'string',
      description: 'Một câu trả lời mẫu tự nhiên mà học viên có thể nói tiếp, bằng ngôn ngữ đang học.',
    },
  },
  required: ['reply', 'replyTranslation', 'correction', 'grammarNotes', 'vocabNotes', 'suggestedReply'],
};

/** practiceTargets.grammar có thể là string đơn giản (từ Sổ tay) hoặc object {name, pattern, explanationVi, example} (từ Lộ trình). */
function formatGrammarTarget(item) {
  if (typeof item === 'string') return item;
  const parts = [item.name];
  if (item.pattern) parts.push(`(${item.pattern})`);
  if (item.explanationVi) parts.push(`— ${item.explanationVi}`);
  if (item.example) parts.push(`Ví dụ: "${item.example}"`);
  return parts.join(' ');
}

function buildSystemPrompt({ language, topic, videoContext, practiceTargets, known }) {
  const lang = LANGUAGE_NAMES[language];
  const lines = [
    `Bạn là bạn đồng hành luyện nói ${lang.vi} (${lang.name}) cho một học viên người Việt, trò chuyện qua giọng nói trên điện thoại.`,
    'Luôn trả lời bằng một JSON object đúng theo schema đã cấu hình.',
    '',
    'NGUYÊN TẮC HỘI THOẠI:',
    `1. Luôn trả lời (trường "reply") bằng ${lang.name}, ngắn gọn 2-3 câu, văn nói tự nhiên, và LUÔN kết thúc bằng một câu hỏi mở để học viên nói tiếp.`,
    `1b. QUY TẮC BẮT BUỘC: "reply" và "suggestedReply" phải viết 100% bằng ${lang.name}, TUYỆT ĐỐI KHÔNG chèn bất kỳ từ, cụm từ hay câu tiếng Việt nào vào giữa — kể cả khi diễn đạt một khái niệm khó. Nếu không chắc từ ${lang.name} nào phù hợp, hãy diễn giải bằng từ ${lang.name} đơn giản hơn thay vì chuyển sang tiếng Việt. Bản dịch tiếng Việt CHỈ được đặt trong "replyTranslation", không lẫn vào "reply".`,
    '2. Trình độ mặc định: trung cấp thấp. Nếu học viên trả lời trôi chảy thì nâng dần độ khó; nếu học viên chật vật thì dùng câu ngắn, từ dễ hơn.',
    '3. Lồng ghép ngữ pháp một cách TỰ NHIÊN: thỉnh thoảng chủ động dùng một cấu trúc hữu ích trong reply rồi ghi nó vào "grammarNotes" (tối đa 1 điểm mỗi lượt, chỉ khi thực sự đáng học). Đừng biến hội thoại thành bài giảng.',
    '4. Nếu tin nhắn gần nhất của học viên có lỗi ngữ pháp/từ vựng/cách diễn đạt thiếu tự nhiên, điền vào "correction" (giải thích tiếng Việt, ngắn gọn, khích lệ). Lỗi nhỏ không đáng kể hoặc câu đúng thì để correction = null. KHÔNG nhắc lỗi trong "reply" — reply chỉ tập trung tiếp chuyện.',
    '5. "vocabNotes": chọn 0-3 từ/cụm hay trong reply của bạn mà học viên có thể chưa biết.',
    '6. "suggestedReply": gợi ý một câu trả lời mẫu để học viên tham khảo nếu bí ý.',
    '7. Nếu lịch sử hội thoại trống: chào thân thiện, giới thiệu chủ đề trong 1 câu, và hỏi một câu dễ để khởi động.',
  ];

  if (language === 'ja') {
    lines.push('8. Tiếng Nhật: dùng thể lịch sự (です・ます) là chính, kanji ở mức thông dụng. Trường "reading" của vocabNotes ghi hiragana.');
  }

  lines.push('', `CHỦ ĐỀ HÔM NAY: ${topic || 'Trò chuyện tự do'}`);

  if (videoContext) {
    lines.push('', 'BỐI CẢNH TỪ VIDEO YOUTUBE HỌC VIÊN ĐÃ CHỌN (bám sát nội dung này khi dẫn dắt hội thoại):', videoContext);
  }

  if (practiceTargets?.vocab?.length || practiceTargets?.grammar?.length) {
    lines.push(
      '',
      'MỤC TIÊU LUYỆN TẬP — đây là trọng tâm của buổi học này. Dẫn dắt hội thoại xoay quanh việc để học viên nghe và tự dùng được các mục sau NHIỀU LẦN trong suốt cuộc trò chuyện, khen ngợi khi dùng đúng, nhẹ nhàng gợi lại nếu học viên quên dùng:'
    );
    if (practiceTargets.vocab?.length) lines.push(`- Từ vựng: ${practiceTargets.vocab.map(formatGrammarTarget).join(', ')}`);
    if (practiceTargets.grammar?.length) {
      lines.push(`- Ngữ pháp: ${practiceTargets.grammar.map(formatGrammarTarget).join(' | ')}`);
      lines.push('Hãy tự mình dùng đúng cấu trúc ngữ pháp này trong "reply" ít nhất một lần ngay từ lượt đầu để làm mẫu, sau đó tạo tình huống để học viên phải dùng lại nó.');
    }
  }

  if (known?.vocab?.length || known?.grammar?.length) {
    lines.push('', 'HỌC VIÊN ĐÃ CÓ TRONG SỔ TAY (đừng thêm lại vào grammarNotes/vocabNotes):');
    if (known.vocab?.length) lines.push(`- Từ vựng: ${known.vocab.join(', ')}`);
    if (known.grammar?.length) lines.push(`- Ngữ pháp: ${known.grammar.join(', ')}`);
  }

  return lines.join('\n');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { language, topic, videoContext, practiceTargets, known, history } = body;

    if (!LANGUAGE_NAMES[language]) {
      return Response.json({ error: 'Ngôn ngữ không hợp lệ.' }, { status: 400 });
    }

    const system = buildSystemPrompt({ language, topic, videoContext, practiceTargets, known });

    // Lấy tối đa 20 lượt gần nhất để giữ context gọn
    const turns = (history || []).slice(-20).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text,
    }));

    // Lượt mở đầu (chưa có lịch sử) dùng chỉ dẫn kích hoạt
    const messages = turns.length
      ? turns
      : [{ role: 'user', content: '(Hãy bắt đầu cuộc hội thoại theo đúng nguyên tắc.)' }];

    const result = await callLLM({
      system,
      messages,
      schemaName: 'tutor_reply',
      schema: RESPONSE_SCHEMA,
    });

    return Response.json(result);
  } catch (err) {
    console.error('[api/chat]', err);
    const status = err instanceof LLMError ? err.status : 500;
    return Response.json({ error: err.message || 'Lỗi máy chủ.' }, { status });
  }
}
