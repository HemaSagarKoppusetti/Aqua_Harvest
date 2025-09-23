import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ApolloProvider } from './lib/apollo-client'
import { Toaster } from './components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AquaHarvest - AI-Powered Rainwater Harvesting Assistant',
  description: 'Smart assessment tool for rooftop rainwater harvesting potential using AI and satellite imagery',
  keywords: 'rainwater harvesting, AI, water conservation, RTRWH, artificial recharge, smart india hackathon',
  authors: [{ name: 'AquaHarvest Team' }],
  openGraph: {
    title: 'AquaHarvest - AI Rainwater Harvesting Assistant',
    description: 'Get instant assessment of your rainwater harvesting potential with AI-powered analysis',
    url: 'https://aquaharvest.in',
    siteName: 'AquaHarvest',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'AquaHarvest - Rainwater Harvesting Assessment',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AquaHarvest - AI Rainwater Harvesting Assistant',
    description: 'Smart assessment tool for rooftop rainwater harvesting potential',
    images: ['/twitter-image.jpg'],
  },
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-aqua-blue-50 to-earth-green-50`}>
        <ApolloProvider>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster />
        </ApolloProvider>
      </body>
    </html>
  )
}