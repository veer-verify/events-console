import { useNavigate } from 'react-router-dom';
import { clearStorage } from '../StorageService';
import { manageUserSession } from '../ApiService';

export const useLogout = () => {
    const navigate = useNavigate('');

    const logout = async () => {
        await manageUserSession('logOut');
        clearStorage();
        navigate('/');
        // setTimeout(() => window.location.reload(), 1000);
    }

    return logout;
}