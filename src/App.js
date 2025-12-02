import './App.css';
import { Routes, Route } from 'react-router-dom';
import SignIn from './auth/signin/SignIn';
import Dashboard from './dashboard/Dashboard';
import { ToastContainer } from 'react-toastify';
import { Fragment } from 'react/jsx-runtime';
import PageLoader from './utilities/page-loader/PageLoader';
import { useSelector } from 'react-redux';


function App() {
  const loaderStore = useSelector((state) => state.loaderStore);

  return (
    <Fragment>
      {loaderStore.mainLoader && <PageLoader />}
      <ToastContainer />
      <Routes>
        <Route path='/' Component={SignIn}></Route>
        <Route path='/dashboard' Component={Dashboard}></Route>
      </Routes>
    </Fragment>

  );
}

export default App;
