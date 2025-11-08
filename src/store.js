import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer } from "./auth/sessionSlice";
import { actionTagReducer } from "./dashboard/actionTagSlice";


export const store = configureStore({
  reducer: {
    sessionStore: sessionReducer,
    actionStore: actionTagReducer
  },
});
