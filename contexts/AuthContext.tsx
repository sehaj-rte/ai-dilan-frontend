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
  register: (email: string, username: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isLoading: boolean
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

  const register = async (email: string, username: string, password: string, fullName?: string) => {
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
          full_name: fullName 
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
      isLoading
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
