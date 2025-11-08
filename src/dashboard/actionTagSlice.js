import { createSlice } from "@reduxjs/toolkit";
import { setStorage } from "../utilities/StorageService";

const actionTagSlice = createSlice({
    name: 'action',
    initialState: { data: null },
    reducers: {
        saveAction: (state, action) => {
            state.data = action.payload;
            // setStorage('actionTags', state.data);
        }
    }
})

export const { saveAction } = actionTagSlice.actions;
export const actionTagReducer = actionTagSlice.reducer;