'use client'

import { ClientAuthFlowProvider } from '@/contexts/ClientAuthFlowContext'
import { ExpertProvider } from '@/contexts/ExpertContext'
import { ExpertFooter } from '@/components/legal'

export default function ExpertLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientAuthFlowProvider>
      <ExpertProvider>
        <div className="h-screen flex flex-col">
          <main className="flex-1">
            {children}
          </main>
          <ExpertFooter className="z-40" />
        </div>
      </ExpertProvider>
    </ClientAuthFlowProvider>
  )
}
