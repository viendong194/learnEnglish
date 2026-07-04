import { Inter, Outfit, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import MobileContainer from '../components/layout/MobileContainer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const notoJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-jp',
  display: 'swap',
});

export const metadata = {
  title: 'Nói Đi | Luyện nói EN · JA',
  description: 'Trợ lý AI giúp bạn mở miệng nói tiếng Anh và tiếng Nhật mỗi ngày — hội thoại, sửa lỗi, ghi chú ngữ pháp và từ vựng tự động.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nói Đi',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#030712',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${inter.variable} ${outfit.variable} ${notoJP.variable} h-full`}>
      <body className="h-full bg-slate-950 font-sans antialiased overflow-hidden text-slate-100">
        <MobileContainer>
          {children}
        </MobileContainer>
      </body>
    </html>
  );
}
