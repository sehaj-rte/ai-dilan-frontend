'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import UserMenu from './UserMenu'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  username: string
  full_name?: string
  phone_number?: string
  bio?: string
  avatar_url?: string
  is_active: boolean
  role?: string
}

interface ExpertPageHeaderProps {
  expertName: string
  user: User | null
  isAuthenticated: boolean
  onShowAuthModal: () => void
  onShowProfileModal: () => void
  onShowBilling: () => void
  onLogout: () => void
  primaryColor: string
  hasBackdrop?: boolean
  showBackButton?: boolean
  onBack?: () => void
  children?: React.ReactNode
}

const ExpertPageHeader: React.FC<ExpertPageHeaderProps> = ({
  expertName,
  user,
  isAuthenticated,
  onShowAuthModal,
  onShowProfileModal,
  onShowBilling,
  onLogout,
  primaryColor,
  hasBackdrop = false,
  showBackButton = false,
  onBack,
  children
}) => {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <div
      className={`relative z-40 overflow-visible ${hasBackdrop
        ? "bg-white/60 backdrop-blur-xl border-b border-white/30 shadow-lg"
        : "bg-white border-b border-gray-200 shadow-sm"
        }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Back button and Expert name */}
          <div className="flex items-center space-x-3">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600 mr-1"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1
              className={`text-lg sm:text-xl font-bold ${hasBackdrop ? "text-gray-900" : "text-gray-900"
                } truncate`}
            >
              {expertName}
            </h1>
          </div>

          {/* Right side - User actions */}
          <div className="flex items-center space-x-2">
            {children}
            <UserMenu
              user={user}
              isAuthenticated={isAuthenticated}
              onShowAuthModal={onShowAuthModal}
              onShowProfileModal={onShowProfileModal}
              onShowBilling={onShowBilling}
              onLogout={onLogout}
              primaryColor={primaryColor}
              hasBackdrop={hasBackdrop}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExpertPageHeader