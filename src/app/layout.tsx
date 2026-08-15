import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://together.app'),
  title: 'Together — Станьте ближе',
  description: 'Приложение для пар: научные опросники, совместный отчёт, ИИ-ассистент, база знаний о партнёре и подборки свиданий. Приватно и этично.',
  keywords: ['отношения', 'пара', 'психология', 'совместимость', 'конфликты', 'близость', 'ИИ', 'свидания'],
  authors: [{ name: 'Together Team' }],
  creator: 'Together',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://together.app',
    siteName: 'Together',
    title: 'Together — Станьте ближе',
    description: 'Научные опросники для пар, совместный отчёт, ИИ-ассистент, куда пойти вдвоём.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Together — приложение для пар',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Together — Станьте ближе',
    description: 'Научные опросники для пар, совместный отчёт, ИИ-ассистент.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Together" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50 transition-colors duration-300 antialiased">
        {children}
      </body>
    </html>
  )
}