import axios from 'axios';
import './SignIn.css';
import React, { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Encrypt, set } from '../../services/StorageService';
import PageLoader from '../../utilities/page-loader/PageLoader';
import { environment } from '../../environment';
import {getMetadata} from '../../services/metadataService';

const SignIn = () => {
  const navigate = useNavigate('');

  const [loader, setLoader] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [callingSystemDetail, setCallingSystemDetail] = useState("vms");


  const handleSignIn = async () => {
    const url = `${environment.login_url}/user_login_1_0`;
    const encryptedPassword = Encrypt(password);
    const requestBody = { userName, ...{ password: encryptedPassword }, callingSystemDetail };
    setLoader(true);
   
    axios.post(url, requestBody).then((res) => {
      setLoader(false);
      set('user', res);
      set('AccessToken',res.data.AccessToken);
      set('RefreshToken',res.data.RefreshToken);
      navigate('/dashboard');
       getMetadata();
    }).catch((err) => {
      setLoader(false);
    });
  }


  return (
    <Fragment>
      { loader && <PageLoader /> }

      <div className="app-container">
        <div className="left-panel"></div>

        <div className="right-panel">
          <div className="login-box">
            <div className="logo">
              <img src='images/logo.svg' alt='loading' loading='lazy' />
            </div>

            <p className='welcome'>Welcome to sign in</p>

            <div className="form-group">
              <label>Username</label>
              <input type="text" placeholder="Enter" onChange={(e) => setUserName(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Password here" onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="remember-me">
              {/* <div>
                <input type="checkbox" id="remember" />
                <span></span>
                <label htmlFor="remember">Remember Password</label>
              </div> */}
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
