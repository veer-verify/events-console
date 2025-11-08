import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer } from "./auth/sessionSlice";


export const store = configureStore({
  reducer: {
    session: sessionReducer
  },
});
