import './SignIn.css';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { clearStorage, Encrypt, getStorage, setStorage } from '../utilities/StorageService';
import { useDispatch } from 'react-redux';
import { saveSession } from '../utilities/slices/sessionSlice';
import { login, manageUserSession } from '../utilities/ApiService';
import Swal from 'sweetalert2'
import { setMainLoader } from '../utilities/slices/loaderSlice';
import { handleApiForConfig, handleApiForLogout } from '../utilities/slices/actionTagSlice';

const SignIn = () => {
  const navigate = useNavigate('');

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();

  const handleSignIn = async () => {
    const encryptedPassword = Encrypt(password);
    const requestBody = { userName, ...{ password: encryptedPassword, callingSystemDetail: 'events-console' } };
    if (!userName || !password) return toast.error("Please Fill Username & Password");

    dispatch(setMainLoader(true));
    const loginData = await login(requestBody);
    dispatch(setMainLoader(false));

    if (loginData?.Status === 'Success') {
      setStorage('session', loginData);
      dispatch(saveSession(loginData));

      dispatch(setMainLoader(true));
      const activeSession = await manageUserSession('logIn');
      dispatch(setMainLoader(false));

      if (activeSession?.statusCode === 200) {
        const temp = getStorage('session');
        setStorage('session', { ...temp, sessionId: activeSession?.sessionId });
        dispatch(saveSession({ ...temp, sessionId: activeSession?.sessionId }));

        if (loginData.userLevel) {
          dispatch(handleApiForLogout(true));
          dispatch(handleApiForConfig(false));
          navigate('/dashboard');
        } else {
          Swal.fire({
            title: "Failed!",
            text: 'Queue was not assigned!',
            icon: "warning",
          })
        }
      }
    } else {
      Swal.fire({
        title: "Failed!",
        text: loginData?.message,
        icon: "warning",
      })
    }
  }

  useEffect(() => {
    clearStorage();
  }, [])


  return (
    <div className="app-container">
      <div className="left-panel"></div>

      <div className="right-panel">
        <div className="login-box">
          <div className="logo">
            <img src='images/verifai-logo.png' alt='loading' loading='lazy' />
          </div>

          <p className='welcome'>Welcome to sign in</p>

          <div className="form-group">
            <label>Username</label>
            <input type="text" placeholder="Enter" onChange={(e) => setUserName(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input className='pass' type={showPassword ? 'text' : 'password'} placeholder="Password here" onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSignIn()
              }} />
            {/* <img className='togglepass' src={showPassword ?  'images/show.svg' : 'images/hide.svg' } onClick={togglePassword}/> */}
            {/* <div>
                <img src='icons/user.svg' alt='' style={{ position: 'absolute', top: '16px', right: '16px', cursor: 'pointer' }} />
              </div> */}
          </div>

          <div className="remember-me">
            <div>
              <input type="checkbox" id="remember" onChange={() => setShowPassword(!showPassword)} />
              <label htmlFor="remember">Show Password</label>
            </div>
            {/* <a href="/" className="forgot">Forgot Password?</a> */}
          </div>

          <button className="login-btn" onClick={handleSignIn}>LOG IN</button>
        </div>
      </div>
    </div>
  )
}

export default SignIn;
