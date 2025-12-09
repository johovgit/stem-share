import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stem Share - Share stems with your band',
  description: 'Upload and share audio stems with your musicians. No login required for listeners.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
