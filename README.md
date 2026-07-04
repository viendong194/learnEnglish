# Nói Đi 🎙️ — App luyện nói tiếng Anh & tiếng Nhật

App cá nhân giúp bạn **mở miệng nói mỗi ngày**: hội thoại bằng giọng nói với AI, được sửa lỗi nhẹ nhàng, lồng ghép ngữ pháp trong lúc trò chuyện, và tự động ghi lại từ vựng + ngữ pháp vào sổ tay. Chủ đề nói có thể lấy từ **bất kỳ video YouTube nào**.

## Tính năng

- 🗣️ **Hội thoại bằng giọng nói** (EN 🇬🇧 / JA 🇯🇵) — nhận diện giọng nói và đọc câu trả lời ngay trên trình duyệt điện thoại (Web Speech API, miễn phí)
- ✏️ **Sửa lỗi tự nhiên** — AI chỉ ra cách nói đúng/tự nhiên hơn kèm giải thích tiếng Việt, không cắt ngang mạch hội thoại
- 📌 **Lồng ghép ngữ pháp** — mỗi lượt trò chuyện AI khéo léo dùng một cấu trúc hữu ích và lưu vào sổ tay
- 📓 **Sổ tay tự động** — từ vựng và ngữ pháp đã học được lưu vào IndexedDB (trên máy bạn, không cần đăng nhập); chọn các mục trong sổ tay để mở buổi **luyện tập nhắm mục tiêu**
- 📺 **Chủ đề từ YouTube** — dán link video bất kỳ, Gemini xem video và tạo chủ đề thảo luận + từ vựng liên quan
- 📱 **Tối ưu mobile** — giao diện mobile-first, thêm vào màn hình chính dùng như app
- 🔒 **Khoá bằng username/password riêng** — chỉ mình bạn dùng được, không cần database (xem phần Đăng nhập bên dưới)

## Chạy local

```bash
npm install
cp .env.example .env.local   # rồi điền GEMINI_API_KEY, APP_USERNAME, APP_PASSWORD
npm run dev
```

Lấy Gemini API key miễn phí tại [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Đăng nhập

App có 1 màn hình đăng nhập chặn toàn bộ trang (kể cả API) — chỉ ai biết đúng username/password mới dùng được, tránh người lạ dùng ké quota Gemini của bạn nếu link bị lộ.

- Tự chọn 1 cặp username/password bất kỳ, điền vào biến môi trường `APP_USERNAME` và `APP_PASSWORD` (local: `.env.local`; Vercel: Project Settings → Environment Variables).
- Không có tài khoản mặc định — nếu chưa cấu hình 2 biến này, app sẽ luôn báo "Đăng nhập thất bại".
- Phiên đăng nhập lưu trong cookie 30 ngày; bấm icon 🔓 ở góc trang chủ để đăng xuất.

## Deploy lên Vercel

1. Push code lên GitHub:
   ```bash
   git add -A && git commit -m "feat: voice tutor app" && git push
   ```
2. Vào [vercel.com/new](https://vercel.com/new) → Import repo này (framework tự nhận Next.js, không cần chỉnh gì).
3. Ở bước cấu hình, thêm Environment Variables: `GEMINI_API_KEY`, `APP_USERNAME`, `APP_PASSWORD`.
4. Deploy. Mở link trên điện thoại → đăng nhập → menu trình duyệt → **Thêm vào màn hình chính**.

Hoặc dùng CLI: `npx vercel --prod` (nhớ `npx vercel env add GEMINI_API_KEY`, `APP_USERNAME`, `APP_PASSWORD`).

## Lưu ý khi dùng trên điện thoại

- **Chrome trên Android** hỗ trợ nhận diện giọng nói tốt nhất. Trên iPhone dùng **Safari** (iOS 14.5+).
- Lần đầu bấm nút mic, trình duyệt sẽ xin quyền micro — hãy cho phép.
- Dữ liệu sổ tay nằm trong trình duyệt của thiết bị; xoá dữ liệu trang web sẽ mất sổ tay.
- Video YouTube phải ở chế độ công khai để Gemini đọc được. Free tier Gemini có giới hạn thời lượng video mỗi ngày; video quá dài có thể bị từ chối.

## Kiến trúc

- **Next.js 14 (App Router)** — 3 màn hình: Trang chủ (chọn ngôn ngữ + chủ đề), Hội thoại, Sổ tay
- **API routes** (`app/api/chat`, `app/api/topic`) gọi **Gemini 2.5 Flash** với structured output (JSON schema); API key chỉ nằm ở server
- **Dexie (IndexedDB)** — lưu phiên hội thoại, từ vựng, ngữ pháp ngay trên thiết bị
- **Web Speech API** — SpeechRecognition (nói) + SpeechSynthesis (nghe), hỗ trợ `en-US` và `ja-JP`
- **middleware.js** — chặn mọi request chưa đăng nhập (trừ `/login`, `/api/login`, `/api/logout`), xác thực qua cookie HMAC-signed (`lib/auth.js`), không cần database
