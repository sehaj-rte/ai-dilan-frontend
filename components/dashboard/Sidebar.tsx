'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import {
  Home,
  MessageSquare,
  Users,
  Settings,
  Brain,
  Mic,
  BarChart3,
  LogOut,
  User,
  Plus,
  BookOpen
} from 'lucide-react'

const sidebarItems = [
  {
    title: 'All Agents',
    href: '/projects',
    icon: Home
  },
  {
    title: 'Knowledge Base',
    href: '/dashboard/knowledge-base',
    icon: BookOpen
  }
]

interface SidebarProps {
  onClose?: () => void
  projectId?: string
}

const Sidebar: React.FC<SidebarProps> = ({ onClose, projectId }) => {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const [projectName, setProjectName] = useState<string>('Dilan AI')
  
  // Debug: Log user data
  useEffect(() => {
    console.log('👤 User data in Sidebar:', user)
  }, [user])

  // Fetch project name when projectId is available
  useEffect(() => {
    const fetchProjectName = async () => {
      if (!projectId) {
        setProjectName('Dilan AI')
        return
      }
      
      try {
        const response = await fetchWithAuth(`${API_URL}/experts/${projectId}`, {
          headers: getAuthHeaders(),
        })
        const data = await response.json()
        
        if (data.success && data.expert) {
          setProjectName(data.expert.name || 'Project')
        }
      } catch (error) {
        console.error('Error fetching project name:', error)
        setProjectName('Project')
      }
    }

    fetchProjectName()
  }, [projectId])

  // Create dynamic sidebar items based on context
  const dynamicSidebarItems = React.useMemo(() => {
    if (projectId) {
      return [
        {
          title: 'Knowledge Base',
          href: `/project/${projectId}/knowledge-base`,
          icon: BookOpen
        },
        {
          title: 'Talk to Knowledge Base',
          href: `/project/${projectId}/chat`,
          icon: MessageSquare
        },
        {
          title: 'All Agents',
          href: '/projects',
          icon: Home
        }
      ]
    }
    return sidebarItems
  }, [projectId])

  const handleLogout = () => {
    dispatch(logout())
    router.push('/auth/login')
  }

  const handleLinkClick = () => {
    onClose?.()
  }

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
        <Link href="/projects" className="flex items-center space-x-3" onClick={handleLinkClick}>
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">{projectName.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-xl font-bold text-blue-600">{projectName}</span>
        </Link>
        {/* Close button for mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* User Info */}
      {user && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.full_name || user.username || user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {dynamicSidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default Sidebar
