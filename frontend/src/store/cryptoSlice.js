import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import cryptoAPI from '../api/cryptoAPI';

export const fetchMyKeys = createAsyncThunk(
  'crypto/fetchMyKeys',
  async (_, { rejectWithValue }) => {
    try {
      const response = await cryptoAPI.getMyKeys();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch keys');
    }
  }
);

export const savePublicKey = createAsyncThunk(
  'crypto/savePublicKey',
  async (data, { rejectWithValue }) => {
    try {
      const response = await cryptoAPI.savePublicKey(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to save public key');
    }
  }
);

export const fetchRecipients = createAsyncThunk(
  'crypto/fetchRecipients',
  async (organizationId, { rejectWithValue }) => {
    try {
      const response = await cryptoAPI.getRecipients(organizationId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch recipients');
    }
  }
);

const cryptoSlice = createSlice({
  name: 'crypto',
  initialState: {
    hasPublicKey: false,
    publicKey: null,
    encryptedPrivateKey: null,
    privateKeyUnlocked: null, // Decrypted private key (in-memory only, never persisted)
    recipients: [],
    loading: false,
    error: null,
  },
  reducers: {
    setPrivateKey: (state, action) => {
      state.privateKeyUnlocked = action.payload;
    },
    clearPrivateKey: (state) => {
      state.privateKeyUnlocked = null;
    },
    clearCryptoState: (state) => {
      state.hasPublicKey = false;
      state.publicKey = null;
      state.encryptedPrivateKey = null;
      state.privateKeyUnlocked = null;
      state.recipients = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyKeys.pending, (state) => { state.loading = true; })
      .addCase(fetchMyKeys.fulfilled, (state, action) => {
        state.loading = false;
        state.hasPublicKey = action.payload.has_public_key;
        state.publicKey = action.payload.public_key;
        state.encryptedPrivateKey = action.payload.encrypted_private_key;
      })
      .addCase(fetchMyKeys.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(savePublicKey.fulfilled, (state) => {
        state.hasPublicKey = true;
      })
      .addCase(fetchRecipients.fulfilled, (state, action) => {
        state.recipients = action.payload;
      });
  },
});

export const { setPrivateKey, clearPrivateKey, clearCryptoState, clearError } = cryptoSlice.actions;
export default cryptoSlice.reducer;
