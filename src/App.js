import './App.css';
import { Routes, Route } from 'react-router-dom';
import SignIn from './auth/signin/SignIn';
import Dashboard from './dashboard/Dashboard';
import { ToastContainer } from 'react-toastify';
import { Fragment } from 'react/jsx-runtime';


function App() {
  return (
    <Fragment>
      <ToastContainer />
      <Routes>
        <Route path='/' Component={SignIn}></Route>
        <Route path='/dashboard' Component={Dashboard}></Route>
      </Routes>
    </Fragment>

  );
}

export default App;
