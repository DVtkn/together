import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import { SWRProvider } from '@/components/providers/swr-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://together.app'),
  title: 'Loop — Станьте ближе',
  description: 'Приложение для пар: научные опросники, совместный отчёт, ИИ-ассистент, база знаний о партнёре и подборки свиданий. Приватно и этично.',
  keywords: ['отношения', 'пара', 'психология', 'совместимость', 'конфликты', 'близость', 'ИИ', 'свидания'],
  authors: [{ name: 'Loop Team' }],
  creator: 'Loop',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://together.app',
    siteName: 'Loop',
    title: 'Loop — Станьте ближе',
    description: 'Научные опросники для пар, совместный отчёт, ИИ-ассистент, куда пойти вдвоём.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Loop — приложение для пар',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Loop — Станьте ближе',
    description: 'Научные опросники для пар, совместный отчёт, ИИ-ассистент.',
    images: ['/og-image.png'],
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const theme = (await cookies()).get('loop:theme')?.value === 'night' ? 'night' : 'aurora'
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Loop" />
        <meta name="theme-color" content="#0F172A" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} ${theme} min-h-full flex flex-col antialiased`} suppressHydrationWarning>
        <SWRProvider>{children}</SWRProvider>
      </body>
    </html>
  )
}