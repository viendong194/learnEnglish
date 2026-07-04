// Lộ trình ngữ pháp cố định (dữ liệu tĩnh, không cần gọi AI) — dùng để tạo buổi luyện nói nhắm đúng 1 điểm ngữ pháp.

function t(name, pattern, explanationVi, example) {
  return { name, pattern, explanationVi, example };
}

const EN_LEVELS = [
  {
    id: 'a1',
    label: 'A1 · Mới bắt đầu',
    topics: [
      t('Động từ "to be"', 'I am / You are / He is...', 'Chia động từ "to be" theo chủ ngữ, nền tảng của mọi câu giới thiệu.', 'I am a student.'),
      t('Thì hiện tại đơn', 'S + V(s/es)', 'Diễn tả thói quen, sự thật hiển nhiên.', 'She works in Hanoi.'),
      t('There is / There are', 'There is + danh từ số ít; There are + danh từ số nhiều', 'Diễn tả sự tồn tại của vật/người.', 'There is a book on the table.'),
      t('Tính từ sở hữu', 'my / your / his / her / our / their', 'Chỉ sự sở hữu, đứng trước danh từ.', 'This is my phone.'),
      t('Động từ khuyết thiếu "can"', 'S + can + V(nguyên mẫu)', 'Diễn tả khả năng hoặc xin phép.', 'I can swim.'),
      t('Câu hỏi Wh-', 'What/Where/When/Who + do/does + S + V?', 'Cấu trúc câu hỏi thông tin cơ bản.', 'Where do you live?'),
    ],
  },
  {
    id: 'a2',
    label: 'A2 · Sơ cấp',
    topics: [
      t('Thì quá khứ đơn', 'S + V-ed / V2', 'Diễn tả hành động đã xảy ra và kết thúc trong quá khứ.', 'I visited Japan last year.'),
      t('Thì hiện tại tiếp diễn', 'S + am/is/are + V-ing', 'Diễn tả hành động đang xảy ra ngay lúc nói.', 'I am studying English now.'),
      t('So sánh hơn & so sánh nhất', 'adj-er/more + adj than...; the + adj-est', 'So sánh giữa 2 hay nhiều sự vật.', 'This book is more interesting than that one.'),
      t('Tương lai gần "be going to"', 'S + am/is/are + going to + V', 'Diễn tả dự định, kế hoạch đã quyết định.', 'We are going to travel next month.'),
      t('Have to / Must', 'S + have to/must + V', 'Diễn tả nghĩa vụ, sự bắt buộc.', 'I have to finish this report today.'),
      t('Some / Any', 'some (câu khẳng định), any (phủ định/nghi vấn)', 'Dùng với danh từ đếm được số nhiều và không đếm được.', 'Is there any milk left?'),
    ],
  },
  {
    id: 'b1',
    label: 'B1 · Trung cấp',
    topics: [
      t('Thì hiện tại hoàn thành', 'S + have/has + V3', 'Diễn tả hành động bắt đầu trong quá khứ, còn liên quan hiện tại hoặc chưa xác định thời điểm.', 'I have lived here for five years.'),
      t('Câu điều kiện loại 1', 'If + S + V(hiện tại), S + will + V', 'Diễn tả điều kiện có thật ở hiện tại/tương lai.', 'If it rains, I will stay home.'),
      t('Will vs Going to', 'will: quyết định tức thời; going to: kế hoạch đã định', 'Phân biệt 2 cách nói về tương lai.', 'I think I will call her later.'),
      t('Modal suy đoán: must/might/can\'t', 'S + must/might/can\'t + V', 'Diễn tả mức độ chắc chắn khi suy đoán.', 'He must be tired after the trip.'),
      t('Used to', 'S + used to + V(nguyên mẫu)', 'Diễn tả thói quen/trạng thái trong quá khứ nay không còn.', 'I used to live in Da Nang.'),
      t('Mệnh đề quan hệ (who/which/that)', 'Noun + who/which/that + mệnh đề', 'Bổ nghĩa cho danh từ đứng trước.', 'The man who called you is my colleague.'),
    ],
  },
  {
    id: 'b2',
    label: 'B2 · Trung cao cấp',
    topics: [
      t('Câu điều kiện loại 2', 'If + S + V-ed, S + would + V', 'Diễn tả tình huống giả định không có thật ở hiện tại.', 'If I had more time, I would learn Japanese.'),
      t('Thì hiện tại hoàn thành tiếp diễn', 'S + have/has been + V-ing', 'Nhấn mạnh quá trình liên tục từ quá khứ đến hiện tại.', 'I have been working here since 2020.'),
      t('Câu bị động', 'S + be + V3 (+ by O)', 'Nhấn mạnh vào đối tượng chịu tác động thay vì người thực hiện.', 'This report was written by my manager.'),
      t('Câu tường thuật', 'S + said/told + (that) + mệnh đề lùi thì', 'Thuật lại lời nói của người khác.', 'She said that she was tired.'),
      t('Suy đoán quá khứ: must have / might have', 'S + must/might/can\'t + have + V3', 'Suy đoán về một sự việc đã xảy ra.', 'He must have forgotten the meeting.'),
      t('Gerund vs Infinitive', 'V-ing (danh động từ) vs to + V (động từ nguyên mẫu)', 'Một số động từ theo sau bởi V-ing, số khác theo sau bởi to-V.', 'I enjoy reading, but I decided to leave early.'),
    ],
  },
  {
    id: 'c1',
    label: 'C1 · Cao cấp',
    topics: [
      t('Câu điều kiện hỗn hợp', 'If + S + had + V3, S + would + V(nguyên mẫu)', 'Kết hợp điều kiện ở quá khứ với kết quả ở hiện tại.', 'If I had studied harder, I would have a better job now.'),
      t('Đảo ngữ nhấn mạnh', 'Never/Rarely/Not only + trợ động từ + S + V', 'Đảo trật tự câu để nhấn mạnh, thường dùng trong văn viết/nói trang trọng.', 'Never have I seen such a beautiful sunset.'),
      t('Câu chẻ (Cleft sentence)', 'It is/was + thành phần nhấn mạnh + that + mệnh đề', 'Nhấn mạnh một thành phần cụ thể trong câu.', 'It was the manager who made the final decision.'),
      t('Thức giả định (Subjunctive)', 'It is essential/important that + S + V(nguyên mẫu)', 'Diễn tả yêu cầu, đề nghị mang tính trang trọng.', 'It is essential that he arrive on time.'),
      t('Mệnh đề phân từ', 'V-ing/V-ed + ..., S + V', 'Rút gọn mệnh đề để câu văn súc tích, trang trọng hơn.', 'Having finished the report, she went home early.'),
    ],
  },
  {
    id: 'c2',
    label: 'C2 · Thành thạo',
    topics: [
      t('Rào đón khi khẳng định (Hedging)', 'It could be argued that... / It would seem that...', 'Giảm nhẹ mức độ chắc chắn của phát biểu, thường dùng trong tranh luận học thuật.', 'It could be argued that the policy has failed.'),
      t('Đảo ngữ nâng cao', 'Rarely/Under no circumstances/Not until + đảo ngữ', 'Các dạng đảo ngữ ít phổ biến hơn, thể hiện trình độ cao.', 'Rarely have I encountered such dedication.'),
      t('Liên từ diễn ngôn học thuật', 'Nevertheless, Furthermore, Consequently...', 'Liên kết ý mạch lạc trong văn nói/viết trang trọng.', 'Nevertheless, the data suggests otherwise.'),
      t('Tỉnh lược & phép thế', 'so/neither + trợ động từ + S', 'Tránh lặp từ bằng cách tỉnh lược hoặc thay thế.', 'She can speak French, and so can I.'),
      t('Cụm động từ thành ngữ nâng cao', 'phrasal verbs: fall through, iron out, hold off...', 'Cụm động từ mang nghĩa bóng, thường gặp trong hội thoại tự nhiên trình độ cao.', 'The negotiations fell through at the last minute.'),
    ],
  },
];

const JA_GENERAL_LEVELS = [
  {
    id: 'n5',
    label: 'N5 · Nhập môn',
    topics: [
      t('Thể lịch sự です・ます', 'Noun/Adj + です; V-ます', 'Thể lịch sự cơ bản dùng trong hầu hết giao tiếp hàng ngày.', '私は学生です。'),
      t('Trợ từ は và が', 'Noun + は (chủ đề); Noun + が (chủ ngữ nhấn mạnh/mới)', 'Phân biệt cách nêu chủ đề và chủ ngữ trong câu.', '猫がいます。'),
      t('Trợ từ を', 'Noun + を + động từ', 'Đánh dấu tân ngữ trực tiếp của động từ.', 'パンを食べます。'),
      t('Trợ từ に và で', 'に (thời gian/điểm đến); で (địa điểm hành động, phương tiện)', 'Hai trợ từ dễ nhầm lẫn nhất ở trình độ đầu.', '図書館で勉強します。'),
      t('Thể て', 'V-て', 'Dùng để nối các hành động liên tiếp hoặc yêu cầu.', '朝ご飯を食べて、学校に行きます。'),
      t('〜ています', 'V-て + います', 'Diễn tả hành động đang diễn ra hoặc thói quen/trạng thái.', '今、雨が降っています。'),
      t('〜たいです', 'V-ます (bỏ ます) + たいです', 'Diễn tả mong muốn của bản thân.', '日本へ行きたいです。'),
    ],
  },
  {
    id: 'n4',
    label: 'N4 · Sơ cấp',
    topics: [
      t('Thể khả năng（可能形）', 'V-られる/えます', 'Diễn tả khả năng làm được việc gì.', '漢字が読めます。'),
      t('〜てもいいです・〜てはいけません', 'V-て + もいいです / はいけません', 'Xin phép và cấm đoán.', '写真を撮ってもいいですか。'),
      t('〜なければなりません', 'V-ない (bỏ い thêm ければなりません)', 'Diễn tả sự bắt buộc phải làm.', '宿題をしなければなりません。'),
      t('Thể điều kiện ば・たら', 'V/Adj-ば; V-たら', 'Diễn tả điều kiện giả định.', '安ければ、買います。'),
      t('あげる・もらう・くれる', 'あげる (cho), もらう (nhận), くれる (được cho)', 'Diễn tả hướng cho/nhận giữa người nói và người khác.', '友達に本をもらいました。'),
      t('Thể bị động（受身形）', 'V-られる', 'Diễn tả hành động chịu tác động từ người/vật khác.', '先生に褒められました。'),
      t('〜そうです（vẻ ngoài）', 'V-ます/Adj + そうです', 'Nhận xét dựa trên vẻ bề ngoài quan sát được.', 'このケーキはおいしそうです。'),
    ],
  },
  {
    id: 'n3',
    label: 'N3 · Trung cấp',
    topics: [
      t('Thể sai khiến（使役形）', 'V-させる', 'Diễn tả việc bắt/cho phép ai đó làm gì.', '母は私に部屋を掃除させました。'),
      t('〜わけ', 'V/Adj + わけだ', 'Giải thích lý do, kết luận hợp lý.', '道理で寒いわけだ、雪が降っている。'),
      t('〜はず', 'V/Adj + はずです', 'Diễn tả sự chắc chắn dựa trên suy luận logic.', '彼はもう着いたはずです。'),
      t('〜べき', 'V(từ điển) + べきだ', 'Diễn tả điều nên làm về mặt đạo lý/trách nhiệm.', 'もっと勉強するべきです。'),
      t('Kính ngữ nhập môn（尊敬語・謙譲語）', 'いらっしゃる／まいる', 'Bước đầu làm quen với kính ngữ trong giao tiếp lịch sự.', '先生がいらっしゃいました。'),
      t('〜ことにする・〜ことになっている', 'V(từ điển/ない) + ことにする/ことになっている', 'Diễn tả quyết định cá nhân hoặc quy định đã có.', '毎朝走ることにしています。'),
      t('〜ように', 'V(từ điển/ない) + ように', 'Diễn tả mục đích một cách nhẹ nhàng, thường đi với động từ ý chí.', '忘れないようにメモします。'),
    ],
  },
  {
    id: 'n2',
    label: 'N2 · Trung cao cấp',
    topics: [
      t('Kính ngữ đầy đủ（尊敬語・謙譲語）', 'お + V-ます + になる／いたす', 'Kính ngữ dùng thành thạo trong môi trường công sở.', '資料をお送りいたします。'),
      t('〜において・〜にとって', 'Noun + において (trong bối cảnh); Noun + にとって (đối với)', 'Diễn tả bối cảnh hoặc góc nhìn.', '現代社会において、環境問題は重要だ。'),
      t('〜おかげで・〜せいで', 'V/Noun + おかげで (nhờ có); せいで (tại vì, mang nghĩa tiêu cực)', 'Diễn tả nguyên nhân dẫn đến kết quả tốt/xấu.', '先生のおかげで合格できました。'),
      t('〜にもかかわらず', 'V/Adj/Noun + にもかかわらず', 'Diễn tả sự tương phản, "mặc dù".', '雨にもかかわらず、彼は出かけた。'),
      t('〜あげく・〜末に', 'V-た + あげく／末に', 'Diễn tả kết quả sau một quá trình dài, thường mang sắc thái vất vả.', '長い議論の末に、結論が出た。'),
      t('〜てからでないと', 'V-て + からでないと', 'Diễn tả điều kiện tiên quyết bắt buộc.', '許可を得てからでないと、始められません。'),
      t('〜ざるを得ない', 'V-ない (bỏ ない) + ざるを得ない', 'Diễn tả việc buộc phải làm dù không muốn.', '残業せざるを得ない状況だ。'),
    ],
  },
  {
    id: 'n1',
    label: 'N1 · Cao cấp',
    topics: [
      t('〜ずにはいられない', 'V-ない (bỏ ない) + ずにはいられない', 'Diễn tả cảm xúc/hành động không thể kìm nén được.', 'この本を読むと、泣かずにはいられない。'),
      t('〜てやまない', 'V-て + やまない', 'Diễn tả mong muốn/tình cảm mãnh liệt, kéo dài (văn trang trọng).', '彼の成功を願ってやまない。'),
      t('〜が早いか', 'V(từ điển) + が早いか', 'Diễn tả hành động xảy ra ngay lập tức sau hành động khác.', 'ベルが鳴るが早いか、彼は飛び出した。'),
      t('〜ともなると', 'Noun + ともなると', 'Diễn tả "một khi đã ở vị trí/mức độ đó thì...".', '社長ともなると、責任は重い。'),
      t('〜べからず', 'V(từ điển) + べからず', 'Cấm đoán mang văn phong cổ, trang trọng (biển báo, quy định).', '芝生に入るべからず。'),
      t('〜にたえない', 'Noun/V + にたえない', 'Diễn tả điều không chịu nổi/không đáng để làm.', '見るにたえない光景だった。'),
    ],
  },
];

const JA_BJT_LEVELS = [
  {
    id: 'bjt-basic',
    label: 'Cơ bản · Giao tiếp công sở hàng ngày',
    topics: [
      t('Chào hỏi công việc', 'いつもお世話になっております。', 'Câu chào mở đầu chuẩn mực khi liên hệ công việc, dùng cả điện thoại lẫn email.', 'いつもお世話になっております、ABC商事の田中です。'),
      t('Kính ngữ お+V-ます+になる', 'お + V-ます (bỏ ます) + になる', 'Tôn kính hành động của đối phương (khách hàng, cấp trên).', '資料をお読みになりましたか。'),
      t('Xác nhận lịch sự', '〜でよろしいでしょうか', 'Xác nhận thông tin một cách lịch sự, tránh khẳng định cộc lốc.', '来週の会議は3時でよろしいでしょうか。'),
      t('Xin lỗi trang trọng', '申し訳ございません', 'Mức độ xin lỗi trang trọng nhất, dùng khi làm phiền/gây lỗi với khách hàng.', 'ご迷惑をおかけして申し訳ございません。'),
      t('Tự giới thiệu công việc', '〜と申します。よろしくお願いいたします。', 'Mẫu tự giới thiệu chuẩn khi gặp đối tác/khách hàng lần đầu.', '初めまして、営業部の田中と申します。よろしくお願いいたします。'),
      t('Nghe điện thoại công sở', 'お電話ありがとうございます。〜でございます。', 'Mẫu câu mở đầu cuộc gọi đến công ty.', 'お電話ありがとうございます。ABC商事でございます。'),
    ],
  },
  {
    id: 'bjt-intermediate',
    label: 'Trung cấp · Trao đổi & báo cáo',
    topics: [
      t('Khiêm nhường ngữ khi báo cáo', 'V-ます (bỏ ます) + させていただきます', 'Thông báo hành động của bản thân một cách khiêm tốn, lịch sự.', '本日、資料を送付させていただきます。'),
      t('Hẹn lịch lịch sự', '〜のご都合はいかがでしょうか', 'Hỏi ý kiến đối phương về thời gian một cách lịch sự.', '来週水曜日のご都合はいかがでしょうか。'),
      t('Báo cáo tiến độ/kế hoạch', '〜の予定でございます', 'Thông báo lịch trình hoặc kế hoạch dự kiến.', '納品は来月10日の予定でございます。'),
      t('Từ chối khéo léo', 'あいにく〜', 'Từ chối một cách nhẹ nhàng, không gây mất lòng.', 'あいにく、その日は都合がつきません。'),
      t('Xác nhận lại để tránh hiểu lầm', '〜という理解でよろしいでしょうか', 'Xác nhận lại nội dung đã trao đổi để tránh sai sót.', '来週までに納品するという理解でよろしいでしょうか。'),
      t('Nhờ vả lịch sự', '〜ていただけますでしょうか', 'Mức độ nhờ vả lịch sự cao, thường dùng với khách hàng/cấp trên.', '資料をご確認いただけますでしょうか。'),
    ],
  },
  {
    id: 'bjt-advanced',
    label: 'Nâng cao · Đàm phán & xử lý tình huống',
    topics: [
      t('Trình bày tình huống bất khả kháng', '〜せざるを得ない状況でございます', 'Giải thích lý do buộc phải thay đổi kế hoạch một cách trang trọng.', '予算の都合上、計画を変更せざるを得ない状況でございます。'),
      t('Đề xuất kế hoạch trang trọng', '〜の段取りで進めさせていただきたく存じます', 'Đề xuất phương án tiến hành công việc trong văn phong rất trang trọng.', '来月から新体制の段取りで進めさせていただきたく存じます。'),
      t('Xử lý khiếu nại khách hàng', 'ご迷惑をおかけし誠に申し訳ございません', 'Mức xin lỗi cao nhất khi xử lý khiếu nại/sự cố với khách hàng.', 'この度はご迷惑をおかけし誠に申し訳ございません。'),
      t('Đề xuất mềm mỏng trong đàm phán', '〜と存じますが、いかがでしょうか', 'Đưa ra ý kiến một cách khiêm tốn, để ngỏ cho đối phương phản hồi.', 'この条件が妥当かと存じますが、いかがでしょうか。'),
      t('Trình bày số liệu trang trọng', '〜という結果となっております', 'Báo cáo số liệu/kết quả kinh doanh trong văn phong báo cáo chính thức.', '売上は前年比10%増という結果となっております。'),
      t('Kết thúc đàm phán tích cực', '前向きに検討させていただきます', 'Câu chốt thường dùng để khép lại một cuộc đàm phán theo hướng tích cực.', 'ご提案について、前向きに検討させていただきます。'),
    ],
  },
];

export const ROADMAP = {
  en: {
    label: 'Tiếng Anh',
    flag: '🇬🇧',
    tracks: [
      { key: 'general', label: 'Lộ trình CEFR (A1 → C2)', levels: EN_LEVELS },
    ],
  },
  ja: {
    label: 'Tiếng Nhật',
    flag: '🇯🇵',
    tracks: [
      { key: 'general', label: 'Ngữ pháp tổng quát (N5 → N1)', levels: JA_GENERAL_LEVELS },
      { key: 'bjt', label: 'Tiếng Nhật thương mại (BJT)', levels: JA_BJT_LEVELS },
    ],
  },
};

/** Gán id ổn định cho từng topic: `${lang}-${trackKey}-${levelId}-${index}` — dùng để lưu tiến độ. */
export function topicId(language, trackKey, levelId, index) {
  return `${language}-${trackKey}-${levelId}-${index}`;
}
