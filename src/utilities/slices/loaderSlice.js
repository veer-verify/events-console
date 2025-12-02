import { createSlice } from "@reduxjs/toolkit";

const loaderSlice = createSlice({
    name: 'loader',
    initialState: { eventLoader: false, mainLoader: false },
    reducers: {
        setLoader: (state, action) => {
            state.eventLoader = action.payload;
        },
        setMainLoader: (state, action) => {
            state.mainLoader = action.payload;
        }
    }
})

export const { setLoader, setMainLoader } = loaderSlice.actions;
export const loaderReducer = loaderSlice.reducer;