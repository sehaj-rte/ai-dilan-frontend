'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout, loadUserFromStorage } from '@/store/slices/authSlice'
import { Menu, X } from 'lucide-react'

const Header = () => {
  const dispatch = useAppDispatch()
  const { user, isAuthenticated } = useAppSelector((state) => state.auth)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Load user from localStorage on component mount
    dispatch(loadUserFromStorage())
  }, [dispatch])

  const handleLogout = () => {
    dispatch(logout())
    setMobileMenuOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 bg-dilan-black rounded-md flex items-center justify-center mr-2">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="text-xl font-bold text-black ml-1">ilan AI</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-1">
              <Link href="#" className="text-gray-600 hover:text-black transition-colors text-sm">
                Industries
              </Link>
              <span className="text-gray-400">▼</span>
            </div>
            <Link href="#" className="text-gray-600 hover:text-black transition-colors text-sm">
              Pricing
            </Link>
            <div className="flex items-center space-x-1">
              <Link href="#" className="text-gray-600 hover:text-black transition-colors text-sm">
                Resources
              </Link>
              <span className="text-gray-400">▼</span>
            </div>
            <Link href="#" className="text-gray-600 hover:text-black transition-colors text-sm">
              Explore
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <>
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="text-sm text-gray-600">
                    Welcome, <span className="font-medium text-gray-900">{user.username}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/register" 
                  className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-dilan-black rounded-lg hover:bg-dilan-gray-dark transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
            
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-black hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-100">
              <Link 
                href="#" 
                className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Industries
              </Link>
              <Link 
                href="#" 
                className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                href="#" 
                className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Resources
              </Link>
              <Link 
                href="#" 
                className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Explore
              </Link>
              
              {isAuthenticated && user ? (
                <>
                  <div className="px-3 py-2 text-sm text-gray-600">
                    Welcome, <span className="font-medium text-gray-900">{user.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-md"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/auth/login" 
                    className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="block px-3 py-2 text-base font-medium text-white bg-dilan-black rounded-md hover:bg-dilan-gray-dark"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
