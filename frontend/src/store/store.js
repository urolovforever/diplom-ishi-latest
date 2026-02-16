import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import confessionsReducer from './confessionsSlice';
import documentsReducer from './documentsSlice';
import notificationsReducer from './notificationsSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    confessions: confessionsReducer,
    documents: documentsReducer,
    notifications: notificationsReducer,
    ui: uiReducer,
  },
});
