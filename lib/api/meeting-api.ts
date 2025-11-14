import { API_URL } from '../config';
import { fetchWithAuth, getAuthHeaders } from '../api-client';

const MEETING_API_BASE = `${API_URL}/meeting`;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  bot?: any;
  bots?: any[];
  transcript?: any;
  status?: string;
  message?: string;
  count?: number;
}

export const meetingApi = {
  /**
   * Create a Recall bot for a meeting URL
   */
  async createBot(meetingUrl: string, userId?: string, agentId?: string): Promise<ApiResponse> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('user_id', userId);
      if (agentId) params.append('agent_id', agentId);
      
      const url = `${MEETING_API_BASE}/start-bot${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meeting_url: meetingUrl }),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error creating bot:', error);
      return {
        success: false,
        error: error.message || 'Failed to create bot',
      };
    }
  },

  /**
   * Get all bots for a user
   */
  async getUserBots(userId: string, agentId?: string, excludeProcessed?: boolean): Promise<ApiResponse> {
    try {
      const params = new URLSearchParams({ user_id: userId });
      if (agentId) params.append('agent_id', agentId);
      if (excludeProcessed !== undefined) params.append('exclude_processed', excludeProcessed.toString());
      
      const response = await fetchWithAuth(`${MEETING_API_BASE}/bots?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching user bots:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch bots',
      };
    }
  },

  /**
   * Get bot details and status
   */
  async getBotDetails(botId: string): Promise<ApiResponse> {
    try {
      const response = await fetchWithAuth(`${MEETING_API_BASE}/bot/${botId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch bot details';
      
      // 404 errors are expected for newly created bots - log as info
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        console.log(`ℹ️ Bot ${botId.slice(0, 8)} not yet available in Recall.ai (expected for new bots)`);
      } else {
        console.error('Error fetching bot details:', error);
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Get transcript status
   */
  async getTranscript(botId: string): Promise<ApiResponse> {
    try {
      const response = await fetchWithAuth(`${MEETING_API_BASE}/get-transcript/${botId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch transcript',
      };
    }
  },

  /**
   * Download transcript JSON
   */
  async downloadTranscript(botId: string): Promise<ApiResponse> {
    try {
      const response = await fetchWithAuth(`${MEETING_API_BASE}/bot/${botId}/download-transcript`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error downloading transcript:', error);
      return {
        success: false,
        error: error.message || 'Failed to download transcript',
      };
    }
  },

  /**
   * Save transcript to file
   */
  async saveTranscript(botId: string): Promise<ApiResponse> {
    try {
      const response = await fetchWithAuth(`${MEETING_API_BASE}/bot/${botId}/save-transcript`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error saving transcript:', error);
      return {
        success: false,
        error: error.message || 'Failed to save transcript',
      };
    }
  },

  /**
   * Check Meeting API health
   */
  async checkHealth(): Promise<ApiResponse> {
    try {
      const response = await fetchWithAuth(`${MEETING_API_BASE}/health`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error checking health:', error);
      return {
        success: false,
        error: error.message || 'Failed to check health',
      };
    }
  },
};
