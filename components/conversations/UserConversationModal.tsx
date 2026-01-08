"use client"

import React, { useEffect, useState } from 'react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { X, MessageSquare, Clock, User } from 'lucide-react'

interface SessionItem {
  session_id: string
  started_at: string | null
  last_activity: string | null
  turns: number
}

interface MessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string | null
}

interface Props {
  expertId: string
  userId: string
  name?: string
  email?: string
  onClose: () => void
}

const UserConversationModal: React.FC<Props> = ({ expertId, userId, name, email, onClose }) => {
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messages, setMessages] = useState<MessageItem[]>([])

  // Fetch sessions for user
  const loadSessions = async () => {
    try {
      setLoadingSessions(true)
      const res = await fetchWithAuth(`${API_URL}/experts/${expertId}/conversations/users/${userId}`, {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load sessions')
      setSessions(data.sessions || [])
      // Auto-select latest session
      if (data.sessions && data.sessions.length > 0) {
        setSelectedSessionId(data.sessions[0].session_id)
      }
    } catch (e) {
      console.error('Failed to load sessions:', e)
    } finally {
      setLoadingSessions(false)
    }
  }

  // Fetch messages for selected session
  const loadMessages = async (sessionId: string) => {
    try {
      setLoadingMessages(true)
      const res = await fetchWithAuth(`${API_URL}/experts/${expertId}/sessions/${sessionId}/messages?page=1&limit=200`, {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load messages')
      setMessages(data.messages || [])
    } catch (e) {
      console.error('Failed to load messages:', e)
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId, userId])

  useEffect(() => {
    if (selectedSessionId) loadMessages(selectedSessionId)
  }, [selectedSessionId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-[95vw] max-w-5xl h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{name || email || 'User'}'s Conversations</h3>
              <div className="text-xs text-gray-500 truncate max-w-[360px]">
                {email ? <span title={email}>{email}</span> : null}
                {!email && name ? <span title={name}>{name}</span> : null}
                {!email && !name ? <span title={userId}>{userId}</span> : null}
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="p-2">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex h-full">
          {/* Left: Sessions list */}
          <div className="w-80 border-r h-full overflow-auto pb-2">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">Sessions</div>
              <Button variant="outline" size="sm" onClick={loadSessions} disabled={loadingSessions}>Refresh</Button>
            </div>

            {loadingSessions ? (
              <div className="p-6 text-sm text-gray-600">Loading sessions…</div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">No sessions found.</div>
            ) : (
              <ul className="divide-y">
                {sessions.map((s) => (
                  <li
                    key={s.session_id}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedSessionId === s.session_id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedSessionId(s.session_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">{s.session_id.slice(0, 8)}…</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {s.turns}</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.last_activity ? new Date(s.last_activity).toLocaleString() : '—'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right: Messages */}
          <div className="flex-1 h-full flex flex-col pb-1">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">Messages</div>
              {selectedSessionId && (
                <Button variant="outline" size="sm" onClick={() => loadMessages(selectedSessionId!)} disabled={loadingMessages}>Refresh</Button>
              )}
            </div>

            {selectedSessionId ? (
              <div className="flex-1 overflow-auto p-4 pr-2 pb-16 space-y-3">
                {loadingMessages ? (
                  <div className="text-sm text-gray-600">Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-gray-600">No messages in this session.</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`max-w-3xl ${m.role === 'user' ? 'ml-auto text-right' : ''}`}>
                      <div className={`inline-block px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                        {m.content}
                      </div>
                      <div className={`text-[10px] mt-1 mb-1 text-gray-500 ${m.role === 'user' ? '' : ''}`}>
                        {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                      </div>
                    </div>
                  ))
                )}
                {/* Spacer to ensure last timestamp is always visible above the bottom edge */}
                <div className="h-6" />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-600">Select a session to view messages</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserConversationModal
