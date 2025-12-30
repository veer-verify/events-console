import { Navigate } from 'react-router-dom';
import Dashboard from '../../dashboard/Dashboard';
import { getStorage } from '../StorageService';

const ProtectedRoute = () => {
  const session = getStorage('session');
  if (!session) return <Navigate to="/" replace />;
  return <Dashboard />;
};

export default ProtectedRoute;