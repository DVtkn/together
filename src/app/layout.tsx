import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

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
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Together" />
        <meta name="theme-color" content="#0F172A" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} min-h-full flex flex-col antialiased`}>
        {children}
      </body>
    </html>
  )
}