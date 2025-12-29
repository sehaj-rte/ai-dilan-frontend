'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Settings, 
  LogIn,
  ChevronDown,
  User,
  CreditCard,
  LogOut
} from 'lucide-react'
import OptimizedImage from '@/components/ui/OptimizedImage'

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
  hasBackdrop = false
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getUserInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ')
      return names.length > 1 
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : names[0][0].toUpperCase()
    }
    return user?.email?.[0]?.toUpperCase() || 'U'
  }

  const handleDropdownItemClick = (action: () => void) => {
    setDropdownOpen(false)
    action()
  }

  return (
    <div
      className={`${
        hasBackdrop 
          ? "bg-white/60 backdrop-blur-xl border-b border-white/30 shadow-lg" 
          : "bg-white border-b border-gray-200 shadow-sm"
      }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Expert name */}
          <div className="flex items-center space-x-3">
            <h1
              className={`text-xl font-bold ${
                hasBackdrop ? "text-gray-900" : "text-gray-900"
              }`}
            >
              {expertName}
            </h1>
          </div>

          {/* Right side - User actions */}
          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              {/* Profile Dropdown Button */}
              <Button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                variant="ghost"
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg"
              >
                {/* Avatar */}
                <div className="relative">
                  {user.avatar_url ? (
                    <OptimizedImage
                      src={user.avatar_url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                      fallbackClassName="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center"
                      fallbackIcon={
                        <span className="text-blue-600 text-sm font-semibold">
                          {getUserInitials()}
                        </span>
                      }
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-semibold">
                        {getUserInitials()}
                      </span>
                    </div>
                  )}
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>

                {/* Dropdown Arrow */}
                <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </Button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-50 ${
                  hasBackdrop 
                    ? "bg-white/95 backdrop-blur-xl border-white/30" 
                    : "bg-white border-gray-200"
                }`}>
                  <div className="py-1">
                    {/* Profile Settings */}
                    <button
                      onClick={() => handleDropdownItemClick(onShowProfileModal)}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Profile Settings
                    </button>

                    {/* Billing */}
                    <button
                      onClick={() => handleDropdownItemClick(onShowBilling)}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      Billing
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-1"></div>

                    {/* Logout */}
                    <button
                      onClick={() => handleDropdownItemClick(onLogout)}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Not authenticated - Login button */
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onShowAuthModal}
                className="flex items-center gap-2"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor,
                }}
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExpertPageHeader