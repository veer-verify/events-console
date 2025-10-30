import { useNavigate } from 'react-router-dom';
import { clearStorage } from '../../services/StorageService';

export const useLogout = () => {
    const navigate = useNavigate('');

    const logout = () => {
        clearStorage();
        navigate('/');
    }

    return logout;
}