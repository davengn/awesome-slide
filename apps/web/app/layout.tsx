import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import type { Metadata, Viewport } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { appName, gitConfig, siteUrl } from '@/lib/shared';

const instrument = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

const title = `${appName} — a slide framework built for agents`;
const description =
  'A React-first slide framework authored by AI agents. Each page is arbitrary code on a 1920×1080 canvas — versioned, reviewable, yours.';

export const metadata: Metadata = {
  title: {
    default: title,
    template: `%s — ${appName}`,
  },
  description,
  metadataBase: new URL(siteUrl),
  applicationName: appName,
  keywords: [
    'awesome-slide',
    'slides',
    'presentation framework',
    'React slides',
    'Next.js slides',
    'AI agents',
    'Claude Code',
    'MDX slides',
    'slides as code',
    'developer presentations',
  ],
  authors: [{ name: gitConfig.user, url: `https://github.com/${gitConfig.user}` }],
  creator: gitConfig.user,
  publisher: appName,
  category: 'technology',
  alternates: {
    canonical: '/',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title,
    description,
    type: 'website',
    url: siteUrl,
    siteName: appName,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F4EC' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1814' },
  ],
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={instrument.variable}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen" style={{ fontFamily: '"Google Sans Flex Variable", sans-serif' }}>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
