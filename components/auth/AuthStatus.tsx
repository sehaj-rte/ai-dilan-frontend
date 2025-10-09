'use client'

import React from 'react'
import { useAppSelector } from '@/store/hooks'

const AuthStatus = () => {
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth)

  if (isLoading) {
    return <div className="text-gray-600">Loading...</div>
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="font-semibold mb-2">Authentication Status</h3>
      {isAuthenticated && user ? (
        <div className="text-green-600">
          <p>✅ Logged in as: <strong>{user.username}</strong></p>
          <p>Email: {user.email}</p>
          {user.full_name && <p>Name: {user.full_name}</p>}
        </div>
      ) : (
        <div className="text-gray-600">
          <p>❌ Not logged in</p>
        </div>
      )}
    </div>
  )
}

export default AuthStatus
