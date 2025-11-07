import { createSlice } from "@reduxjs/toolkit";
import { getStorage, setStorage } from "../utilities/StorageService";

const sessionSlice = createSlice({
    session: 'session',
    initialState: {session: null},
    reducers: {
        save: (data) => {

        }
    }
});

// export const {save} = sessionSlice;
export default sessionSlice.reducer;