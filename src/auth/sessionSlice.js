import { createSlice } from "@reduxjs/toolkit";
import { setStorage } from "../utilities/StorageService";

const sessionSlice = createSlice({
  name: 'session',
  initialState: { data: null },
  reducers: {
    saveSession: (state, action) => {
      state.data = action.payload;
      // setStorage('session', state.data);
    },
  },
});

export const { saveSession } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;

