import './Header.css';
import React, { useState, useRef, useEffect } from 'react';
import ProfileCard from './profile-card/ProfileCard';


const Header = () => {
    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef();

    const handleClickOutside = (event) => {
        if (profileRef.current && !profileRef.current.contains(event.target)) {
            setShowProfile(false);
        }
    }

    useEffect(() => {
        // document.addEventListener("mousedown", handleClickOutside);
        // return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileRef]);

    return (
        <div className="header-container">
            <div className="header-left">
                <div className="logo">
                    <img src='images/logo.svg' alt='loading' loading='lazy' />
                </div>
                <div className="page-title">
                    CONSOLE LIVE EVENTS <span className="level">| LEVEL - 1</span>
                </div>
            </div>

            <div className="header-right">
                <div className="profile-icon" onClick={() => setShowProfile(!showProfile)}>
                    <img src='icons/user.svg' alt='User' />
                </div>
                <div className="profile-info" ref={profileRef}>
                    <div className="username">Username</div>
                    <div className="role">Screener</div>
                </div>
            </div>

            {showProfile && <ProfileCard />}
        </div>
    )
};

export default Header;