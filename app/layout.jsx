import { Inter, Outfit } from 'next/font/google';
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

export const metadata = {
  title: 'LingoGlide | Mobile Language Studio',
  description: 'AI-powered, offline-first mobile assistant for mastering foreign language conversation and vocabulary.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  themeColor: '#030712',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full`}>
      <body className="h-full bg-slate-950 font-sans antialiased overflow-hidden text-slate-100">
        <MobileContainer>
          {children}
        </MobileContainer>
      </body>
    </html>
  );
}
