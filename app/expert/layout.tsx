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
        <div className={isChatOrCall ? "h-[100dvh] flex flex-col overflow-hidden" : "h-screen flex flex-col overflow-hidden"}>
          <div className={`flex-1 flex flex-col min-h-0 ${isChatOrCall ? '' : 'overflow-y-auto'}`}>
            {children}
          </div>
          {!isChatOrCall && <ExpertFooter className="z-40" />}
        </div>
      </ExpertProvider>
    </ClientAuthFlowProvider>
  )
}
