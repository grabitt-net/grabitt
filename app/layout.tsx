import type { Metadata } from 'next'
import { Nunito, Comfortaa } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '600', '700', '800', '900'],
})

const comfortaa = Comfortaa({
  subsets: ['latin'],
  variable: '--font-comfortaa',
  weight: ['400', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Grabitt — Gran Canaria Marketplace',
  description: 'Buy, sell and discover in Gran Canaria',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${comfortaa.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
