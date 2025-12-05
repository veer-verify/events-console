import './App.css';
import { Routes, Route } from 'react-router-dom';
import SignIn from './signin/SignIn';
import Dashboard from './dashboard/Dashboard';
import { ToastContainer } from 'react-toastify';
import { Fragment } from 'react/jsx-runtime';
import PageLoader from './utilities/page-loader/PageLoader';
import { useSelector } from 'react-redux';
import ProtectedRoute from './utilities/protected-route/ProtectedRoute';
import { getStorage } from './utilities/StorageService';


function App() {
  const session = getStorage('session');
  const loaderStore = useSelector((state) => state.loaderStore);

  return (
    <Fragment>
      {loaderStore.mainLoader && <PageLoader />}
      <ToastContainer />

      <Routes>
        <Route path='/' element={<SignIn />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={session ? true : false}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Fragment>

  );
}

export default App;
