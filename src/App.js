import './App.css';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './dashboard/Dashboard';
import SignIn from './auth/signin/SignIn';
import SuspiciousAlert from './utilities/escalation/Escalation';


function App() {
  return (
    <Routes>
      <Route path='/' Component={SignIn}></Route>
      <Route path='/dashboard' Component={Dashboard}></Route>
    </Routes>
    // <SuspiciousAlert/>

  );
}

export default App;
