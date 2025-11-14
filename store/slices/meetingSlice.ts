import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { meetingApi } from '../../lib/api/meeting-api';

// Types
export interface Bot {
  id?: string;           // From Recall API
  bot_id?: string;       // From our database
  meeting_url: string | { meeting_id: string; platform: string };  // Can be string or object
  status: 'ready' | 'joining_call' | 'in_waiting_room' | 'in_call' | 'in_call_not_recording' | 
          'in_call_recording' | 'call_ended' | 'recording_done' | 'done' | 'fatal' | 'analysis_done';
  status_changes: Array<{
    code: string;
    message: string;
    created_at: string;
  }>;
  recording?: {
    id: string;
    status: string;
  };
  recordings?: Array<{
    id: string;
    status: { code: string };
    media_shortcuts?: {
      video_mixed?: { data?: { download_url?: string } };
      transcript?: { data?: { download_url?: string } };
    };
  }>;
  transcript?: any[];      // Transcript data array from database
  transcript_status?: {
    status: 'processing' | 'done' | 'failed';
    download_url?: string;
  };
  video_url?: string;      // From database - direct video download URL
  transcript_url?: string; // From database - direct transcript download URL
  created_at?: string;     // May not be in Recall API response
  user_id?: string;        // From database
  agent_id?: string;       // From database
  is_processed?: boolean;  // From database - true if added to knowledge base
}

export interface MeetingState {
  bots: Bot[];
  selectedBot: Bot | null;
  isLoading: boolean;
  error: string | null;
  transcript: any | null;
  isTranscriptLoading: boolean;
}

const initialState: MeetingState = {
  bots: [],
  selectedBot: null,
  isLoading: false,
  error: null,
  transcript: null,
  isTranscriptLoading: false,
};

// Async Thunks
export const createBot = createAsyncThunk(
  'meeting/createBot',
  async ({ meetingUrl, userId, agentId }: { meetingUrl: string; userId?: string; agentId?: string }, { rejectWithValue }) => {
    try {
      const response = await meetingApi.createBot(meetingUrl, userId, agentId);
      if (response.success) {
        // Handle both 'bot' and 'data' response formats
        const botData = response.bot || response.data;
        console.log('✅ Bot created:', botData);
        return botData;
      } else {
        return rejectWithValue(response.error || 'Failed to create bot');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create bot');
    }
  }
);

export const fetchUserBots = createAsyncThunk(
  'meeting/fetchUserBots',
  async ({ userId, agentId }: { userId: string; agentId?: string }, { rejectWithValue }) => {
    try {
      const response = await meetingApi.getUserBots(userId, agentId);
      if (response.success) {
        return response.bots || [];
      } else {
        return rejectWithValue(response.error || 'Failed to fetch bots');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch bots');
    }
  }
);

export const fetchBotDetails = createAsyncThunk(
  'meeting/fetchBotDetails',
  async (botId: string, { rejectWithValue }) => {
    try {
      const response = await meetingApi.getBotDetails(botId);
      if (response.success) {
        const botData = response.bot || response.data;
        return botData;
      } else {
        return rejectWithValue(response.error || 'Failed to fetch bot details');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch bot details');
    }
  }
);

export const fetchTranscript = createAsyncThunk(
  'meeting/fetchTranscript',
  async (botId: string, { rejectWithValue }) => {
    try {
      const response = await meetingApi.getTranscript(botId);
      if (response.success) {
        return response.transcript;
      } else {
        return rejectWithValue(response.error || 'Failed to fetch transcript');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch transcript');
    }
  }
);

export const downloadTranscript = createAsyncThunk(
  'meeting/downloadTranscript',
  async (botId: string, { rejectWithValue }) => {
    try {
      const response = await meetingApi.downloadTranscript(botId);
      if (response.success) {
        return response.transcript;
      } else {
        return rejectWithValue(response.error || 'Failed to download transcript');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to download transcript');
    }
  }
);

// Slice
const meetingSlice = createSlice({
  name: 'meeting',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    selectBot: (state, action: PayloadAction<Bot | null>) => {
      state.selectedBot = action.payload;
    },
    clearTranscript: (state) => {
      state.transcript = null;
    },
    addBot: (state, action: PayloadAction<Bot>) => {
      const existingIndex = state.bots.findIndex(b => b.id === action.payload.id);
      if (existingIndex >= 0) {
        state.bots[existingIndex] = action.payload;
      } else {
        state.bots.unshift(action.payload);
      }
      state.error = null; // Clear any previous errors when adding a bot
    },
    clearBots: (state) => {
      state.bots = [];
      state.selectedBot = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create Bot
    builder
      .addCase(createBot.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBot.fulfilled, (state, action) => {
        state.isLoading = false;
        const newBot = action.payload;
        // Ensure bot has a status (default to 'ready' if not set)
        if (!newBot.status && (!newBot.status_changes || newBot.status_changes.length === 0)) {
          newBot.status = 'ready';
        }
        state.bots.unshift(newBot);
        state.selectedBot = newBot;
      })
      .addCase(createBot.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch User Bots
    builder
      .addCase(fetchUserBots.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserBots.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bots = action.payload;
      })
      .addCase(fetchUserBots.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Bot Details
    builder
      .addCase(fetchBotDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBotDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Update in bots list if exists (check both id and bot_id)
        const payloadId = action.payload.id || action.payload.bot_id;
        const index = state.bots.findIndex(b => {
          const botId = b.id || b.bot_id;
          return botId === payloadId;
        });
        if (index >= 0) {
          state.bots[index] = action.payload;
        }
        
        // Only update selectedBot if it's the same bot (avoid race condition with polling)
        if (state.selectedBot) {
          const selectedId = state.selectedBot.id || state.selectedBot.bot_id;
          if (selectedId === payloadId) {
            state.selectedBot = action.payload;
          }
        }
      })
      .addCase(fetchBotDetails.rejected, (state, action) => {
        state.isLoading = false;
        // Don't show 404 errors - bot might not be created yet in Recall's system
        const errorMessage = action.payload as string;
        if (!errorMessage?.includes('404') && !errorMessage?.includes('Not Found')) {
          state.error = errorMessage;
        }
      });

    // Fetch Transcript
    builder
      .addCase(fetchTranscript.pending, (state) => {
        state.isTranscriptLoading = true;
        state.error = null;
      })
      .addCase(fetchTranscript.fulfilled, (state, action) => {
        state.isTranscriptLoading = false;
        state.transcript = action.payload;
      })
      .addCase(fetchTranscript.rejected, (state, action) => {
        state.isTranscriptLoading = false;
        state.error = action.payload as string;
      });

    // Download Transcript
    builder
      .addCase(downloadTranscript.pending, (state) => {
        state.isTranscriptLoading = true;
        state.error = null;
      })
      .addCase(downloadTranscript.fulfilled, (state, action) => {
        state.isTranscriptLoading = false;
        state.transcript = action.payload;
      })
      .addCase(downloadTranscript.rejected, (state, action) => {
        state.isTranscriptLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, selectBot, clearTranscript, addBot, clearBots } = meetingSlice.actions;
export default meetingSlice.reducer;
