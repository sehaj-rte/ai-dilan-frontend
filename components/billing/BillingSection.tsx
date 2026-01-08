'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Settings } from 'lucide-react'
import BillingPanel from './BillingPanel'

interface BillingSectionProps {
  isOpen: boolean
  onClose: () => void
  userToken: string
  expertSlug?: string // Add expertSlug prop
}

const BillingSection: React.FC<BillingSectionProps> = ({
  isOpen,
  onClose,
  userToken,
  expertSlug // Add expertSlug prop
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Billing & Subscriptions
          </DialogTitle>
        </DialogHeader>
        
        <BillingPanel 
          userToken={userToken}
          expertSlug={expertSlug}
        />
      </DialogContent>
    </Dialog>
  )
}

export default BillingSection