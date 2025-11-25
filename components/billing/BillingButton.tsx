'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BillingButtonProps {
  userToken?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showIcon?: boolean
  children?: React.ReactNode
  expertSlug?: string // Add expertSlug prop
  primaryColor?: string // Add primaryColor prop
}

const BillingButton: React.FC<BillingButtonProps> = ({
  userToken,
  variant = 'ghost',
  size = 'sm',
  className = '',
  showIcon = true,
  children,
  expertSlug, // Add expertSlug prop
  primaryColor // Add primaryColor prop
}) => {
  const router = useRouter()

  const handleOpenBilling = () => {
    if (!userToken) {
      // If no token, user needs to login first
      alert('Please log in to access billing settings')
      return
    }

    // Redirect to the new billing page, passing expertSlug as a query parameter if available
    if (expertSlug) {
      router.push(`/billing?expert=${expertSlug}`)
    } else {
      router.push('/billing')
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleOpenBilling}
      className={`flex items-center gap-2 ${className}`}
      style={primaryColor && variant === 'outline' ? {
        borderColor: primaryColor,
        color: primaryColor
      } : primaryColor && variant === 'default' ? {
        backgroundColor: primaryColor
      } : undefined}
    >
      {showIcon && <CreditCard className="w-4 h-4" />}
      {children || 'Billing'}
    </Button>
  )
}

export default BillingButton
