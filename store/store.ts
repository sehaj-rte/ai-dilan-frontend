import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import meetingReducer from './slices/meetingSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    meeting: meetingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
