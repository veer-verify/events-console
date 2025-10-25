import './Header.css';
import React, { useState, useRef, useEffect } from 'react';
import ProfileCard from './profile-card/ProfileCard';
import { getStorage } from '../services/StorageService';


const Header = () => {
    const user = getStorage('user');

    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef(null);


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showProfile && profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfile(false);
            }
        }
        if (showProfile) {
            window.addEventListener("mousedown", handleClickOutside);
        }
        return () => window.removeEventListener("mousedown", handleClickOutside);
    }, [showProfile]);

    return (
        <div className="header-container">
            <div className="header-left">
                <div className="logo">
                    <img src='images/verifai-logo.png' alt='loading' loading='lazy' />
                </div>
                <div className="page-title">
                    <span className='title'>EVENTS CONSOLE</span><span className='bar'> | </span><span className="level">LEVEL - {user?.userLevel ?? 1}</span>
                </div>
            </div>

            <div className="header-right">
                <div className="profile-icon" onClick={() => setShowProfile(!showProfile)}>
                    <img src='icons/user.svg' alt='User' />
                </div>
                <div className="profile-info" >
                    <div className="username">{user?.UserName}</div>
                    <div className="role">Screener</div>
                </div>

                <div ref={profileRef}>
                    {showProfile && <ProfileCard />}
                </div>
            </div>

        </div>
    )
};

export default Header;