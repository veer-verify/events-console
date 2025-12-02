import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer } from "../src/utilities/slices/sessionSlice";
import { actionTagReducer } from "../src/utilities/slices/actionTagSlice";
import { loaderReducer } from "./utilities/slices/loaderSlice";


export const store = configureStore({
  reducer: {
    sessionStore: sessionReducer,
    actionStore: actionTagReducer,
    loaderStore: loaderReducer
  },
});
