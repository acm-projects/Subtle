import './globals.css'
import { Newsreader, Plus_Jakarta_Sans } from 'next/font/google'

// Fonts load once for the whole site, so every page (and the navbar) uses
// the exact same fonts from the first frame, with no swap or jump.
const serif = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-serif' })
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' })

export const metadata = {
  title: 'Subtle',
  description: 'Project authentication with Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${serif.variable} ${body.variable}`}>
      <body className="font-[family-name:var(--font-body)] antialiased">{children}</body>
    </html>
  )
}
