'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
import BillingSection from './BillingSection'

interface BillingButtonProps {
  userToken?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showIcon?: boolean
  children?: React.ReactNode
}

const BillingButton: React.FC<BillingButtonProps> = ({
  userToken,
  variant = 'ghost',
  size = 'sm',
  className = '',
  showIcon = true,
  children
}) => {
  const [isBillingOpen, setIsBillingOpen] = useState(false)

  const handleOpenBilling = () => {
    if (!userToken) {
      // If no token, user needs to login first
      alert('Please log in to access billing settings')
      return
    }
    setIsBillingOpen(true)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenBilling}
        className={`flex items-center gap-2 ${className}`}
      >
        {showIcon && <CreditCard className="w-4 h-4" />}
        {children || 'Billing'}
      </Button>

      <BillingSection
        isOpen={isBillingOpen}
        onClose={() => setIsBillingOpen(false)}
        userToken={userToken || ''}
      />
    </>
  )
}

export default BillingButton
