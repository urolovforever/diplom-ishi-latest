import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import cryptoAPI from '../api/cryptoAPI';

export const checkKeyStatus = createAsyncThunk(
  'crypto/checkKeyStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await cryptoAPI.getMyKeys();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to check key status');
    }
  }
);

export const uploadPublicKey = createAsyncThunk(
  'crypto/uploadPublicKey',
  async (data, { rejectWithValue }) => {
    try {
      const response = await cryptoAPI.savePublicKey(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to upload public key');
    }
  }
);

const cryptoSlice = createSlice({
  name: 'crypto',
  initialState: {
    keyPairGenerated: false,
    publicKey: null,
    hasPrivateKey: false,
    loading: false,
    error: null,
  },
  reducers: {
    setKeyPairGenerated: (state, action) => {
      state.keyPairGenerated = action.payload;
    },
    clearCryptoState: (state) => {
      state.keyPairGenerated = false;
      state.publicKey = null;
      state.hasPrivateKey = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkKeyStatus.pending, (state) => { state.loading = true; })
      .addCase(checkKeyStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.keyPairGenerated = action.payload.has_keys;
        state.publicKey = action.payload.public_key;
        state.hasPrivateKey = !!action.payload.encrypted_private_key;
      })
      .addCase(checkKeyStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(uploadPublicKey.fulfilled, (state) => {
        state.keyPairGenerated = true;
      });
  },
});

export const { setKeyPairGenerated, clearCryptoState } = cryptoSlice.actions;
export default cryptoSlice.reducer;
