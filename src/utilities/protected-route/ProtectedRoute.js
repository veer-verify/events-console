import { Navigate } from 'react-router-dom';
import Dashboard from '../../dashboard/Dashboard';

const ProtectedRoute = ({ isAuthenticated }) => {
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <Dashboard />;
};

export default ProtectedRoute;