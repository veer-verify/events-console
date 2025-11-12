import { useNavigate } from 'react-router-dom';
import { clearStorage } from '../StorageService';

export const useLogout = () => {
    const navigate = useNavigate('');

    const logout = () => {
        clearStorage();
        navigate('/');
        setTimeout(() => window.location.reload(), 1000);
    }

    return logout;
}