import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/components/Web3Provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FlexPass - Universal Pay-As-You-Go Access',
  description: 'Decentralized access protocol for the physical world',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-void text-white min-h-screen`}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  )
}