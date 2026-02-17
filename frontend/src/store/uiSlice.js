import { createSlice } from '@reduxjs/toolkit';

let nextToastId = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    toasts: [],
    sidebarOpen: false,
    sidebarCollapsed: false,
  },
  reducers: {
    addToast: (state, action) => {
      state.toasts.push({
        id: nextToastId++,
        type: action.payload.type || 'info',
        message: action.payload.message,
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const { addToast, removeToast, toggleSidebar, setSidebarOpen, toggleSidebarCollapsed } = uiSlice.actions;
export default uiSlice.reducer;
