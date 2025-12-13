import { createSlice } from "@reduxjs/toolkit";

const actionTagSlice = createSlice({
    name: 'action',
    initialState: { data: null, callApi: true },
    reducers: {
        saveAction: (state, action) => {
            state.data = action.payload;
        },
        setCallApi: (state, action) => {
            state.callApi = action.payload;
        }
    }
})

export const { saveAction, setCallApi } = actionTagSlice.actions;
export const actionTagReducer = actionTagSlice.reducer;