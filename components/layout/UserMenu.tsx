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

interface UserMenuProps {
    user: User | null
    isAuthenticated: boolean
    onShowAuthModal: () => void
    onShowProfileModal: () => void
    onShowBilling: () => void
    onLogout: () => void
    primaryColor: string
    hasBackdrop?: boolean
    className?: string
}

const UserMenu: React.FC<UserMenuProps> = ({
    user,
    isAuthenticated,
    onShowAuthModal,
    onShowProfileModal,
    onShowBilling,
    onLogout,
    primaryColor,
    hasBackdrop = false,
    className = ""
}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('touchstart', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
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

    if (!isAuthenticated || !user) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
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
        )
    }

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Profile Dropdown Button */}
            <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1 sm:gap-2 p-1 sm:p-2 hover:bg-gray-100 rounded-lg group transition-colors focus:outline-none"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
            >
                {/* Avatar */}
                <div className="relative pointer-events-none">
                    {user.avatar_url ? (
                        <OptimizedImage
                            src={user.avatar_url}
                            alt="Profile"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                            fallbackClassName="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center"
                            fallbackIcon={
                                <span className="text-blue-600 text-xs sm:text-sm font-semibold">
                                    {getUserInitials()}
                                </span>
                            }
                        />
                    ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                            <span className="text-blue-600 text-xs sm:text-sm font-semibold">
                                {getUserInitials()}
                            </span>
                        </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>

                {/* Dropdown Arrow */}
                <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
                <div
                    className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${hasBackdrop
                        ? "bg-white/95 backdrop-blur-xl border-white/30"
                        : "bg-white border-gray-200"
                        }`}
                    style={{ zIndex: 9999 }}
                >
                    <div className="py-1">
                        {/* Profile Info - shown in dropdown for better context */}
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                            <p className="text-sm font-bold text-gray-900 truncate">
                                {user.full_name || user.username}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                {user.email}
                            </p>
                        </div>

                        <div className="p-1">
                            {/* Profile Settings */}
                            <button
                                type="button"
                                onClick={() => handleDropdownItemClick(onShowProfileModal)}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors group"
                            >
                                <div className="p-1.5 rounded-md bg-gray-100 group-hover:bg-blue-100 transition-colors">
                                    <User className="h-4 w-4" />
                                </div>
                                <span className="font-medium">Profile Settings</span>
                            </button>

                            {/* Billing */}
                            <button
                                type="button"
                                onClick={() => handleDropdownItemClick(onShowBilling)}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors group"
                            >
                                <div className="p-1.5 rounded-md bg-gray-100 group-hover:bg-blue-100 transition-colors">
                                    <CreditCard className="h-4 w-4" />
                                </div>
                                <span className="font-medium">Billing</span>
                            </button>

                            {/* Divider */}
                            <div className="border-t border-gray-100 my-1 mx-1"></div>

                            {/* Logout */}
                            <button
                                type="button"
                                onClick={() => handleDropdownItemClick(onLogout)}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                            >
                                <div className="p-1.5 rounded-md bg-red-50 group-hover:bg-red-100 transition-colors">
                                    <LogOut className="h-4 w-4" />
                                </div>
                                <span className="font-medium">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserMenu
