import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import aiAPI from '../api/aiAPI';

export const fetchDashboardStats = createAsyncThunk(
  'ai/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await aiAPI.getDashboardStats();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch AI stats');
    }
  }
);

export const fetchAnomalyReports = createAsyncThunk(
  'ai/fetchAnomalyReports',
  async (params, { rejectWithValue }) => {
    try {
      const response = await aiAPI.getAnomalyReports(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch anomaly reports');
    }
  }
);

export const reviewAnomaly = createAsyncThunk(
  'ai/reviewAnomaly',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await aiAPI.reviewAnomaly(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to review anomaly');
    }
  }
);

export const triggerScan = createAsyncThunk(
  'ai/triggerScan',
  async (_, { rejectWithValue }) => {
    try {
      const response = await aiAPI.triggerScan();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to trigger scan');
    }
  }
);

export const fetchModelStatus = createAsyncThunk(
  'ai/fetchModelStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await aiAPI.getModelStatus();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch model status');
    }
  }
);

const aiSlice = createSlice({
  name: 'ai',
  initialState: {
    dashboardStats: null,
    anomalyReports: [],
    anomalyCount: 0,
    modelStatus: null,
    loading: false,
    scanning: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardStats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchAnomalyReports.fulfilled, (state, action) => {
        state.anomalyReports = action.payload.results || action.payload;
        state.anomalyCount = action.payload.count || 0;
      })
      .addCase(reviewAnomaly.fulfilled, (state, action) => {
        const idx = state.anomalyReports.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.anomalyReports[idx] = action.payload;
        if (state.dashboardStats?.recent_anomalies) {
          const sIdx = state.dashboardStats.recent_anomalies.findIndex((r) => r.id === action.payload.id);
          if (sIdx !== -1) state.dashboardStats.recent_anomalies[sIdx] = action.payload;
        }
      })
      .addCase(triggerScan.pending, (state) => { state.scanning = true; })
      .addCase(triggerScan.fulfilled, (state) => { state.scanning = false; })
      .addCase(triggerScan.rejected, (state) => { state.scanning = false; })
      .addCase(fetchModelStatus.fulfilled, (state, action) => {
        state.modelStatus = action.payload;
      });
  },
});

export const { clearError } = aiSlice.actions;
export default aiSlice.reducer;
