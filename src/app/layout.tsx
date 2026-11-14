import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif, Anek_Bangla, Noto_Sans_Bengali } from 'next/font/google';
import { getLang } from '@/lib/lang';
import './globals.css';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz', 'wdth'], variable: '--font-bricolage', display: 'swap' });
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const instrument = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-instrument', display: 'swap' });
const anek = Anek_Bangla({ subsets: ['bengali', 'latin'], axes: ['wdth'], variable: '--font-anek', display: 'swap', preload: false });
const notoBn = Noto_Sans_Bengali({ subsets: ['bengali'], axes: ['wdth'], variable: '--font-noto-bn', display: 'swap', preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'BAUBC · Bangladesh Agricultural University Business Club', template: '%s · BAUBC' },
  description: 'An innovation ecosystem turning students into future founders and industry leaders at the intersection of agriculture, technology and business strategy.',
  openGraph: { siteName: 'BAUBC', type: 'website', locale: 'en_GB' },
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#F6F5EE' }, { media: '(prefers-color-scheme: dark)', color: '#07140E' }],
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${bricolage.variable} ${geist.variable} ${geistMono.variable} ${instrument.variable} ${anek.variable} ${notoBn.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('js');try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
