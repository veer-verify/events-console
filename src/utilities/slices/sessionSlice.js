import { createSlice } from "@reduxjs/toolkit";

const sessionSlice = createSlice({
  name: 'session',
  initialState: { data: null },
  reducers: {
    saveSession: (state, action) => {
      state.data = action.payload;
    },
  },
});

export const { saveSession } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;

