import { StrictMode, createContext } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, createHashRouter } from 'react-router-dom';
import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import SignIn from './signin/SignIn';
import Dashboard from './dashboard/Dashboard';


export const MyContext = createContext();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <HashRouter future={{  : true, v7_relativeSplatPath: true }}>
  <Provider store={store}>
    {/* <MyContext.Provider value={{ name: 'veer', age: 27 }}> */}
    <App />
    {/* </MyContext.Provider> */}
  </Provider>
  // </HashRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
