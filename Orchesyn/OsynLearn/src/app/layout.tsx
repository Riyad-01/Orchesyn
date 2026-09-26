import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/store/app';
import { Shell } from '@/components/layout/shell';
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const display = Manrope({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'OsynLearn — AI English Speaking Coach',
  description:
    'Speak daily with an AI coach. Get detailed feedback on pronunciation, fluency, grammar, vocabulary, fillers and pace — plus day-wise roadmaps and full IELTS speaking mocks.',
  manifest: '/manifest.webmanifest',
  applicationName: 'OsynLearn',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OsynLearn',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  metadataBase: new URL('https://osynlearn.surge.sh'),
  openGraph: {
    title: 'OsynLearn — AI Speaking Coach',
    description:
      'Speak daily, get examiner-grade feedback on pronunciation, fluency, grammar and prosody. 20 languages, on-device privacy, web-first PWA.',
    type: 'website',
    siteName: 'OsynLearn',
    images: [{ url: '/brand/og-1200x630.png', width: 1200, height: 630, alt: 'OsynLearn — Learn more. Become more.' }],
  },
  twitter: {
    card: 'summary',
    title: 'OsynLearn — AI Speaking Coach',
    description: 'Examiner-grade speaking feedback in 20 languages. Free on the web.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#17152A' },
    { media: '(prefers-color-scheme: light)', color: '#f8f8fb' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className={`${body.variable} ${display.variable} font-sans antialiased`}>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
