import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { API_URL } from '@/lib/config'

// Types
interface User {
  id: string
  email: string
  username: string
  full_name?: string
  is_active: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterCredentials {
  email: string
  username: string
  password: string
  full_name?: string
}

interface AuthResponse {
  success: boolean
  message: string
  user: User
  access_token: string
  token_type: string
  expires_in: number
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.detail || 'Login failed')
      }

      // Save to localStorage
      localStorage.setItem('dilan_ai_token', data.access_token)
      localStorage.setItem('dilan_ai_user', JSON.stringify(data.user))

      return data as AuthResponse
    } catch (error) {
      return rejectWithValue('Network error. Please try again.')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (credentials: RegisterCredentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.detail || 'Registration failed')
      }

      // Save to localStorage
      localStorage.setItem('dilan_ai_token', data.access_token)
      localStorage.setItem('dilan_ai_user', JSON.stringify(data.user))

      return data as AuthResponse
    } catch (error) {
      return rejectWithValue('Network error. Please try again.')
    }
  }
)

export const verifyToken = createAsyncThunk(
  'auth/verify',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        return rejectWithValue(data.detail || 'Token verification failed')
      }

      return data.user as User
    } catch (error) {
      return rejectWithValue('Network error. Please try again.')
    }
  }
)

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      
      // Clear localStorage
      localStorage.removeItem('dilan_ai_token')
      localStorage.removeItem('dilan_ai_user')
    },
    clearError: (state) => {
      state.error = null
    },
    loadUserFromStorage: (state) => {
      const token = localStorage.getItem('dilan_ai_token')
      const userStr = localStorage.getItem('dilan_ai_user')
      
      if (token && userStr) {
        state.token = token
        state.user = JSON.parse(userStr)
        state.isAuthenticated = true
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.access_token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.access_token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })

    // Verify token
    builder
      .addCase(verifyToken.pending, (state) => {
        state.isLoading = true
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(verifyToken.rejected, (state) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        // Clear invalid token from storage
        localStorage.removeItem('dilan_ai_token')
        localStorage.removeItem('dilan_ai_user')
      })
  },
})

export const { logout, clearError, loadUserFromStorage } = authSlice.actions
export default authSlice.reducer
