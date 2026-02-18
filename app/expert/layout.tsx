'use client'

import { ClientAuthFlowProvider } from '@/contexts/ClientAuthFlowContext'
import { ExpertProvider } from '@/contexts/ExpertContext'
import { ExpertFooter } from '@/components/legal'
import { usePathname } from 'next/navigation'

export default function ExpertLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Hide footer on chat and call pages to avoid cluttering the interface
  const isChatOrCall = pathname?.includes('/chat') || pathname?.includes('/call')

  return (
    <ClientAuthFlowProvider>
      <ExpertProvider>
        <div className={`${isChatOrCall ? 'h-[100dvh]' : 'h-screen'} flex flex-col overflow-hidden`}>
          <main className={`flex-1 flex flex-col min-h-0 ${isChatOrCall ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            <div className="flex-1 flex flex-col min-h-0">
              {children}
            </div>
            {!isChatOrCall && <ExpertFooter className="z-40" />}
          </main>
        </div>
      </ExpertProvider>
    </ClientAuthFlowProvider>
  )
}
