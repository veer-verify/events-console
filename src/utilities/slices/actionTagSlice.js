import { createSlice } from "@reduxjs/toolkit";

const actionTagSlice = createSlice({
    name: 'action',
    initialState: { data: null, isLogoutClicked: false, isConfigOpened: false },
    reducers: {
        saveAction: (state, action) => {
            state.data = action.payload;
        },
        handleApiForLogout: (state, action) => {
            state.isLogoutClicked = action.payload;
        },
        handleApiForConfig: (state, action) => {
            state.isConfigOpened = action.payload;
        }
    }
})

export const { saveAction, handleApiForLogout, handleApiForConfig } = actionTagSlice.actions;
export const actionTagReducer = actionTagSlice.reducer;