import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import documentsAPI from '../api/documentsAPI';

export const fetchDocuments = createAsyncThunk(
  'documents/fetchDocuments',
  async (params, { rejectWithValue }) => {
    try {
      const response = await documentsAPI.getDocuments(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch documents');
    }
  }
);

export const uploadDocument = createAsyncThunk(
  'documents/uploadDocument',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await documentsAPI.uploadDocument(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Upload failed');
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/deleteDocument',
  async (id, { rejectWithValue }) => {
    try {
      await documentsAPI.deleteDocument(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Delete failed');
    }
  }
);

export const fetchVersions = createAsyncThunk(
  'documents/fetchVersions',
  async (docId, { rejectWithValue }) => {
    try {
      const response = await documentsAPI.getVersions(docId);
      return { docId, versions: response.data.results || response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch versions');
    }
  }
);

export const fetchAccessLogs = createAsyncThunk(
  'documents/fetchAccessLogs',
  async (docId, { rejectWithValue }) => {
    try {
      const response = await documentsAPI.getAccessLogs(docId);
      return { docId, logs: response.data.results || response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch access logs');
    }
  }
);

const documentsSlice = createSlice({
  name: 'documents',
  initialState: {
    list: [],
    count: 0,
    versions: {},
    accessLogs: {},
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.results;
        state.count = action.payload.count;
      })
      .addCase(fetchDocuments.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(uploadDocument.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.list = state.list.filter((d) => d.id !== action.payload);
      })
      .addCase(fetchVersions.fulfilled, (state, action) => {
        state.versions[action.payload.docId] = action.payload.versions;
      })
      .addCase(fetchAccessLogs.fulfilled, (state, action) => {
        state.accessLogs[action.payload.docId] = action.payload.logs;
      });
  },
});

export const { clearError } = documentsSlice.actions;
export default documentsSlice.reducer;
