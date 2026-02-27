import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import confessionsAPI from '../api/confessionsAPI';

export const fetchDashboardStats = createAsyncThunk(
  'confessions/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await confessionsAPI.getDashboardStats();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch stats');
    }
  }
);

export const fetchOrganizations = createAsyncThunk(
  'confessions/fetchOrganizations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await confessionsAPI.getOrganizations();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch organizations');
    }
  }
);

const confessionsSlice = createSlice({
  name: 'confessions',
  initialState: {
    organizations: [],
    stats: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.fulfilled, (state, action) => { state.stats = action.payload; })
      .addCase(fetchOrganizations.fulfilled, (state, action) => {
        state.organizations = action.payload.results || action.payload;
      });
  },
});

export const { clearError } = confessionsSlice.actions;
export default confessionsSlice.reducer;
