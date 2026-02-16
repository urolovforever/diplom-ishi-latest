import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import confessionsAPI from '../api/confessionsAPI';

export const fetchConfessions = createAsyncThunk(
  'confessions/fetchConfessions',
  async (params, { rejectWithValue }) => {
    try {
      const response = await confessionsAPI.getConfessions(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch confessions');
    }
  }
);

export const fetchConfession = createAsyncThunk(
  'confessions/fetchConfession',
  async (id, { rejectWithValue }) => {
    try {
      const response = await confessionsAPI.getConfession(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch confession');
    }
  }
);

export const createConfession = createAsyncThunk(
  'confessions/createConfession',
  async (data, { rejectWithValue }) => {
    try {
      const response = await confessionsAPI.createConfession(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to create confession');
    }
  }
);

export const updateConfession = createAsyncThunk(
  'confessions/updateConfession',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await confessionsAPI.updateConfession(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to update confession');
    }
  }
);

export const transitionConfession = createAsyncThunk(
  'confessions/transitionConfession',
  async ({ id, action }, { rejectWithValue }) => {
    try {
      const actions = {
        submit: confessionsAPI.submitConfession,
        review: confessionsAPI.reviewConfession,
        approve: confessionsAPI.approveConfession,
        reject: confessionsAPI.rejectConfession,
      };
      const response = await actions[action](id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Transition failed');
    }
  }
);

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
    list: [],
    count: 0,
    current: null,
    organizations: [],
    stats: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    clearCurrent: (state) => { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConfessions.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchConfessions.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.results;
        state.count = action.payload.count;
      })
      .addCase(fetchConfessions.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchConfession.pending, (state) => { state.loading = true; })
      .addCase(fetchConfession.fulfilled, (state, action) => { state.loading = false; state.current = action.payload; })
      .addCase(fetchConfession.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createConfession.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(updateConfession.fulfilled, (state, action) => {
        state.current = action.payload;
        const idx = state.list.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(transitionConfession.fulfilled, (state, action) => {
        state.current = action.payload;
        const idx = state.list.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => { state.stats = action.payload; })
      .addCase(fetchOrganizations.fulfilled, (state, action) => {
        state.organizations = action.payload.results || action.payload;
      });
  },
});

export const { clearError, clearCurrent } = confessionsSlice.actions;
export default confessionsSlice.reducer;
