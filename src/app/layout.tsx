import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz', 'wdth'], variable: '--font-bricolage', display: 'swap' });
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const instrument = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-instrument', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'BAUBC · Bangladesh Agricultural University Business Club', template: '%s · BAUBC' },
  description: 'Plant ideas. Harvest founders. The student-run innovation ecosystem at Bangladesh Agricultural University, where agriculture, technology and business strategy meet.',
  openGraph: { siteName: 'BAUBC', type: 'website', locale: 'en_GB' },
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#D4FA4E', viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${geist.variable} ${geistMono.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('js')` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
