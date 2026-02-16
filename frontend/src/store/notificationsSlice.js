import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import notificationsAPI from '../api/notificationsAPI';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params, { rejectWithValue }) => {
    try {
      const response = await notificationsAPI.getNotifications(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch notifications');
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      return response.data.unread_count;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch count');
    }
  }
);

export const markRead = createAsyncThunk(
  'notifications/markRead',
  async (data, { rejectWithValue }) => {
    try {
      const response = await notificationsAPI.markRead(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to mark read');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (id, { rejectWithValue }) => {
    try {
      await notificationsAPI.deleteNotification(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Delete failed');
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    list: [],
    count: 0,
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.results;
        state.count = action.payload.count;
      })
      .addCase(fetchNotifications.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => { state.unreadCount = action.payload; })
      .addCase(markRead.fulfilled, (state, action) => {
        // Refresh unread counts locally
        if (action.meta.arg.all) {
          state.list = state.list.map((n) => ({ ...n, is_read: true }));
          state.unreadCount = 0;
        }
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const removed = state.list.find((n) => n.id === action.payload);
        state.list = state.list.filter((n) => n.id !== action.payload);
        if (removed && !removed.is_read) state.unreadCount -= 1;
      });
  },
});

export const { clearError } = notificationsSlice.actions;
export default notificationsSlice.reducer;
