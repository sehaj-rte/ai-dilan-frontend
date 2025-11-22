'use client'

import { ClientAuthFlowProvider } from '@/contexts/ClientAuthFlowContext'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientAuthFlowProvider>
      {children}
    </ClientAuthFlowProvider>
  )
}
