import { createSlice } from "@reduxjs/toolkit";
import { getStorage, setStorage } from "../utilities/StorageService";

const sessionSlice = createSlice({
  name: 'session',
  initialState: { session: null },
  reducers: {
    save: (state, action) => {
      // you can set static or dynamic values here
    //   state.session = action.payload || { name: 'john' };

      // optionally persist it to storage
      const s = getStorage('session');
      console.log(s)
      state.session = s;
    //   setStorage('sess', s);
    },
  },
});

export const { save } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;

