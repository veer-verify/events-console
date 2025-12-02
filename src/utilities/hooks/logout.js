import { useNavigate } from 'react-router-dom';
import { clearStorage } from '../StorageService';
import { manageUserSession } from '../ApiService';
import { useDispatch } from 'react-redux';
import { setMainLoader } from '../slices/loaderSlice';

export const useLogout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate('');

    const logout = async () => {
        dispatch(setMainLoader(true));
        await manageUserSession('logOut');
        dispatch(setMainLoader(false));
        clearStorage();
        navigate('/');
    }

    return logout;
}