'use client'

import React from 'react'
import { useAppSelector } from '@/store/hooks'

const ClientDashboard = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h1>
          <a href="/client/login" className="text-blue-600 hover:text-blue-700">
            Go to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.full_name || user?.email}</h1>
          <p className="text-gray-600 mt-2">Discover and chat with AI experts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Experts</h3>
            <p className="text-gray-600 mb-4">Find AI experts in various fields</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Browse Now
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Chats</h3>
            <p className="text-gray-600 mb-4">Continue your conversations</p>
            <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              View Chats
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Settings</h3>
            <p className="text-gray-600 mb-4">Manage your profile and preferences</p>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientDashboard
