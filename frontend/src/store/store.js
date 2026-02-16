import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import confessionsReducer from './confessionsSlice';
import documentsReducer from './documentsSlice';
import notificationsReducer from './notificationsSlice';
import aiReducer from './aiSlice';
import uiReducer from './uiSlice';
import cryptoReducer from './cryptoSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    confessions: confessionsReducer,
    documents: documentsReducer,
    notifications: notificationsReducer,
    ai: aiReducer,
    ui: uiReducer,
    crypto: cryptoReducer,
  },
});
