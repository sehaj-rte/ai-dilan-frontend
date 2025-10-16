'use client'

import React, { useState } from 'react'
import Sidebar from './Sidebar'
import AvatarSettingsModal from './AvatarSettingsModal'
import { useAppSelector } from '@/store/hooks'
import { Menu, X, User, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardLayoutProps {
  children: React.ReactNode
  customHeader?: React.ReactNode
  hideDefaultHeader?: boolean
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, customHeader, hideDefaultHeader = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [avatarSettingsOpen, setAvatarSettingsOpen] = useState(false)
  const { user } = useAppSelector((state) => state.auth)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        {!hideDefaultHeader && (
          <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Menu className="h-6 w-6" />
                </button>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                {/* Avatar Settings Button */}
                <Button
                  onClick={() => setAvatarSettingsOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 hover:bg-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border border-gray-200">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {user?.full_name || user?.username || 'User'}
                  </span>
                  <Settings className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
            </div>
          </header>
        )}
        
        {/* Custom Header */}
        {customHeader && (
          <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-6">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button for custom header */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              {customHeader}
            </div>
          </header>
        )}
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
      
      {/* Avatar Settings Modal */}
      <AvatarSettingsModal
        isOpen={avatarSettingsOpen}
        onClose={() => setAvatarSettingsOpen(false)}
      />
    </div>
  )
}

export default DashboardLayout
