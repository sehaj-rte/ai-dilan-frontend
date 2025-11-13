import { API_URL } from '../config'
import { fetchWithAuth, getAuthHeaders } from '../api-client'

const KNOWLEDGE_BASE_API_BASE = `${API_URL}/knowledge-base`

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ProcessMeetingsResponse {
  success: boolean
  message?: string
  processed_count?: number
  total_meetings?: number
  failed_meetings?: Array<{ meeting_id: string; error: string }>
  processed_files?: Array<{
    meeting_id: string
    file_id: string
    filename: string
    word_count: number
  }>
  success_rate?: number
  error?: string
}

export const knowledgeBaseApi = {
  /**
   * Process meeting transcripts and add them to knowledge base
   */
  async processMeetings(
    meetingIds: string[],
    agentId?: string,
    folderId?: string,
    autoFolder?: string
  ): Promise<ProcessMeetingsResponse> {
    try {
      const response = await fetchWithAuth(
        `${KNOWLEDGE_BASE_API_BASE}/process-meetings`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            meeting_ids: meetingIds,
            agent_id: agentId,
            folder_id: folderId,
            auto_folder: autoFolder
          })
        }
      )

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error processing meetings:', error)
      return {
        success: false,
        error: error.message || 'Failed to process meetings'
      }
    }
  }
}
