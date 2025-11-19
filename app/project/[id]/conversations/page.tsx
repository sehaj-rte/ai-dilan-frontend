'use client'

import React, { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { useParams } from 'next/navigation'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Clock, MessagesSquare } from 'lucide-react'
import UserConversationModal from '@/components/conversations/UserConversationModal'

interface ConversationUser {
  user_id: string
  last_activity: string | null
  session_count: number
  email: string
  username: string
  full_name: string | null
}

export default function ConversationsPage() {
  const params = useParams()
  const expertId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<ConversationUser[]>([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email?: string | null } | null>(null)

  const fetchUsers = async (pageNum: number) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchWithAuth(
        `${API_URL}/experts/${expertId}/conversations/users?page=${pageNum}&limit=20`,
        { headers: getAuthHeaders() }
      )
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load users')
      setUsers(data.items || [])
      setHasNext(Boolean(data.pagination?.has_next))
    } catch (e: any) {
      console.error('Failed to fetch conversation users:', e)
      setError(e.message || 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (expertId) fetchUsers(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId, page])

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Conversations</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fetchUsers(page)}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading users…</span>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <p className="text-red-600">{error}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <div className="text-center text-gray-600">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <p>No conversations yet for this expert.</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Last Activity</th>
                      <th className="text-left py-3 px-4 font-medium">Sessions</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.user_id} className="border-t">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="truncate max-w-[280px]">
                              <div className="font-medium text-gray-900 truncate" title={u.full_name || u.username || u.email}>
                                {u.full_name || u.username || u.email}
                              </div>
                              {u.email && (
                                <div className="text-xs text-gray-500 truncate" title={u.email}>{u.email}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {u.last_activity ? new Date(u.last_activity).toLocaleString() : '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <div className="flex items-center gap-1">
                            <MessagesSquare className="h-4 w-4" />
                            {u.session_count}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button size="sm" onClick={() => setSelectedUser({ id: u.user_id, name: u.full_name || u.username || u.email, email: u.email })}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="border-t p-3 flex items-center justify-between">
              <Button variant="outline" disabled={page === 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <div className="text-sm text-gray-600">Page {page}</div>
              <Button variant="outline" disabled={!hasNext || loading} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedUser && (
        <UserConversationModal
          expertId={expertId}
          userId={selectedUser.id}
          name={selectedUser.name}
          email={selectedUser.email || undefined}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </DashboardLayout>
  )
}
