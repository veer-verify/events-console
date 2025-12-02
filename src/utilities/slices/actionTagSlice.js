import { createSlice } from "@reduxjs/toolkit";

const actionTagSlice = createSlice({
    name: 'action',
    initialState: { data: null },
    reducers: {
        saveAction: (state, action) => {
            state.data = action.payload;
        }
    }
})

export const { saveAction } = actionTagSlice.actions;
export const actionTagReducer = actionTagSlice.reducer;