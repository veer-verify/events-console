import './App.css';
import { Routes, Route, RouterProvider } from 'react-router-dom';
import SignIn from './signin/SignIn';
import Dashboard from './dashboard/Dashboard';
import { ToastContainer } from 'react-toastify';
import { Fragment } from 'react/jsx-runtime';
import PageLoader from './utilities/page-loader/PageLoader';
import { useSelector } from 'react-redux';
import ProtectedRoute from './utilities/protected-route/ProtectedRoute';
import { getStorage } from './utilities/StorageService';
import { BrowserRouter, createHashRouter } from 'react-router-dom';



const routes = createHashRouter([
  {
    path: '',
    element: <SignIn />
  },
  {
    path: 'dashboard',
    element:
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>,
  }
])


function App() {
  const loaderStore = useSelector((state) => state.loaderStore);

  return (
    <Fragment>
      {loaderStore.mainLoader && <PageLoader />}
      <ToastContainer />
      <RouterProvider router={routes} future={{ v7_startTransition: true }} />

      {/* <Routes>
        <Route path='/' element={<SignIn />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={session ? true : false}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes> */}
    </Fragment>

  );
}

export default App;
