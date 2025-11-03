import './SignIn.css';
import axios from 'axios';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearStorage, Encrypt, setStorage } from '../../services/StorageService';
import PageLoader from '../../utilities/page-loader/PageLoader';
import { environment } from '../../environment';


const SignIn = () => {
  const navigate = useNavigate('');

  const [loader, setLoader] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = ()=>{
    setShowPassword(!showPassword);
  }

  const handleSignIn = async () => {
    const url = `${environment.login_url}/user_login_1_0`;
    const encryptedPassword = Encrypt(password);
    const requestBody = { userName, ...{ password: encryptedPassword, callingSystemDetail: 'events-console' } };
    setLoader(true);

    axios.post(url, requestBody).then((res) => {
      setLoader(false);
      if (res.data.Status === 'Success') {
        if (!res.data.queueName) return alert('Queue is not assigned!');
        setStorage('session', res.data);
        navigate('/dashboard');
      } else {
        alert(res.data.message);
      }
    }).catch((err) => {
      setLoader(false);
    });
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
              <input className='pass' type={showPassword ? 'text' : 'password'} placeholder="Password here" onChange={(e) => setPassword(e.target.value)} onKeyDown={(e)=>{
                if(e.key==='Enter') handleSignIn();
              }}/>
              <img className='togglepass' src={showPassword ? '../images/hide.svg' : '../images/show.svg'} onClick={togglePassword}/>
              {/* <div>
                <img src='icons/user.svg' alt='' style={{ position: 'absolute', top: '16px', right: '16px', cursor: 'pointer' }} />
              </div> */}
            </div>

            {/* <div className="remember-me"> */}
              {/* <div> */}
                {/* <input type="checkbox" id="remember" onChange={() => setShowPassword(!showPassword)} /> */}
                {/* <span></span> */}
                {/* <label htmlFor="remember">Show Password</label> */}
              {/* </div> */}
              {/* <a href="/" className="forgot">Forgot Password?</a> */}
            {/* </div> */}

            <button className="login-btn" onClick={handleSignIn}>LOG IN</button>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default SignIn;
