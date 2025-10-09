import './App.css';
import { Routes, Route } from 'react-router-dom';
import SignIn from './auth/signin/SignIn';
import Dashboard from './dashboard/Dashboard';


function App() {
  return (
    <Routes>
      <Route path='/' Component={SignIn}></Route>
      <Route path='/dashboard' Component={Dashboard}></Route>
    </Routes>
  );
}

export default App;
