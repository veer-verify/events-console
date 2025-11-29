import './App.css';
import { Routes, Route } from 'react-router-dom';
import SignIn from './auth/signin/SignIn';
import Dashboard from './dashboard/Dashboard';
import { ToastContainer } from 'react-toastify';
import { Fragment } from 'react/jsx-runtime';
import PageLoader from './utilities/page-loader/PageLoader';
import { show_loader } from './utilities/StorageService';


function App() {
  return (
    <Fragment>
      {/* {show_loader && <PageLoader />} */}
      <ToastContainer />
      <Routes>
        <Route path='/' Component={SignIn}></Route>
        <Route path='/dashboard' Component={Dashboard}></Route>
      </Routes>
    </Fragment>

  );
}

export default App;
