import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ReduxProvider } from '@/components/providers/ReduxProvider'
import { LogRocketProvider } from '@/components/providers/LogRocketProvider'
import { LegalProvider } from '@/contexts/LegalContext'
import { LegalFooter } from '@/components/legal'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dilan AI | Scale Your Insight. Stay Focused on What Matters.',
  description: 'Dilan AI turns your expertise into an always-on presence, so you can grow your reach, serve your audience, and lead with clarity, without burning out.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LogRocketProvider>
          <ReduxProvider>
            <LegalProvider>
              <div className="min-h-screen flex flex-col">
                <main className="flex-1">
                  {children}
                </main>
                <LegalFooter />
              </div>
            </LegalProvider>
          </ReduxProvider>
        </LogRocketProvider>
      </body>
    </html>
  )
}
