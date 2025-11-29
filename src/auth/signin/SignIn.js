import './SignIn.css';
import axios from 'axios';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLoader from '../../utilities/page-loader/PageLoader';
import { environment } from '../../environment';
import { toast } from 'react-toastify';
import { clearStorage, Encrypt, getStorage, setStorage } from '../../utilities/StorageService';
import { useDispatch } from 'react-redux';
import { save, saveSession } from '../sessionSlice';
import { login, manageUserSession, userLogin } from '../../utilities/ApiService';
import Swal from 'sweetalert2'
import { useLogout } from '../../utilities/hooks/logout';

const SignIn = () => {
  const navigate = useNavigate('');

  const [loader, setLoader] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const handleSignIn = async () => {
    const encryptedPassword = Encrypt(password);
    const requestBody = { userName, ...{ password: encryptedPassword, callingSystemDetail: 'events-console' } };
    if (!userName || !password) return toast.error("Please Fill Username & Password");

    setLoader(true);
    const loginData = await login(requestBody).catch(() => setLoader(false));
    setStorage('session', loginData);
    dispatch(saveSession(loginData));

    const activeSession = await manageUserSession('logIn').catch(() => setLoader(false));
    const temp = getStorage('session');
    setStorage('session', { ...temp, sessionId: activeSession?.sessionId });
    dispatch(saveSession({ ...temp, sessionId: activeSession?.sessionId }));


    if (activeSession.statusCode === 409) {
      return Swal.fire({
        title: "Are you sure?",
        text: activeSession?.message,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes"
      }).then(async (result) => {
        setLoader(false);
        if (result.isConfirmed) {
          const data = await manageUserSession('logOut');
          Swal.fire({
            title: "Done!",
            text: data.message,
            icon: "success"
          });
        }
      });
    }


    if (loginData.Status === 'Success') {
      if (!loginData.userLevel) {

      } else {
        navigate('/dashboard');
      }
    }
    setLoader(false);
  }

  useEffect(() => {
    clearStorage();
  }, [])


  return (
    <Fragment>
      {loader && <PageLoader />}

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
              <input className='pass' type={showPassword ? 'text' : 'password'} placeholder="Password here" onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => {
                if (e.key === 'Enter') handleSignIn(
                )
              }} />
              {/* <img className='togglepass' src={showPassword ?  'images/show.svg' : 'images/hide.svg' } onClick={togglePassword}/> */}
              {/* <div>
                <img src='icons/user.svg' alt='' style={{ position: 'absolute', top: '16px', right: '16px', cursor: 'pointer' }} />
              </div> */}
            </div>

            <div className="remember-me">
              <div>
                <input type="checkbox" id="remember" onChange={() => setShowPassword(!showPassword)} />
                {/* <span></span> */}
                <label htmlFor="remember">Show Password</label>
              </div>
              {/* <a href="/" className="forgot">Forgot Password?</a> */}
            </div>

            <button className="login-btn" onClick={handleSignIn}>LOG IN</button>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default SignIn;
