'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from '@/lib/config'

interface User {
  id: string
  email: string
  username: string
  full_name?: string
  is_active: boolean
  role?: string  // 'user' | 'super_admin'
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, username: string, password: string, fullName?: string, role?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isLoading: boolean
  handleExpertAccess: (publication: any, sessionType: 'chat' | 'call') => Promise<{ needsAuth?: boolean; redirect?: string; needsPayment?: boolean }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('dilan_ai_token')
    const savedUser = localStorage.getItem('dilan_ai_user')
    
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  // Helper functions for expert access
  const checkExpertOwnership = async (userId: string, expertId: string): Promise<boolean> => {
    try {
      if (!token) return false
      const response = await fetch(`${API_URL}/experts/check-ownership/${expertId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      return data.success && data.is_owner
    } catch (error) {
      console.error('Error checking expert ownership:', error)
      return false
    }
  }

  const checkPaymentAccess = async (userId: string, publicationId: string): Promise<boolean> => {
    try {
      if (!token) return false
      const response = await fetch(`${API_URL}/payments/check-access/${publicationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      return data.success && data.has_access
    } catch (error) {
      console.error('Error checking payment access:', error)
      return false
    }
  }

  // Add expert access handler
  const handleExpertAccess = async (publication: any, sessionType: 'chat' | 'call') => {
    if (!user) {
      return { needsAuth: true }
    }
    
    // Check if user owns the expert
    if (await checkExpertOwnership(user.id, publication.expert_id)) {
      return { redirect: `/client/${publication.slug}/${sessionType}` }
    }
    
    // Check if user has paid
    if (await checkPaymentAccess(user.id, publication.id)) {
      return { redirect: `/client/${publication.slug}/${sessionType}` }
    }
    
    return { needsPayment: true }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setToken(data.access_token)
        
        // Save to localStorage
        localStorage.setItem('dilan_ai_token', data.access_token)
        localStorage.setItem('dilan_ai_user', JSON.stringify(data.user))
        
        return { success: true }
      } else {
        return { success: false, error: data.detail || 'Login failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const register = async (email: string, username: string, password: string, fullName?: string, role: string = 'user') => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          username, 
          password, 
          full_name: fullName,
          role: role  // Add role support
        }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        setToken(data.access_token)
        
        // Save to localStorage
        localStorage.setItem('dilan_ai_token', data.access_token)
        localStorage.setItem('dilan_ai_user', JSON.stringify(data.user))
        
        return { success: true }
      } else {
        return { success: false, error: data.detail || 'Registration failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('dilan_ai_token')
    localStorage.removeItem('dilan_ai_user')
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      isLoading,
      handleExpertAccess  // Add expert access handler
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
