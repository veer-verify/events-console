import { Link, useNavigate } from 'react-router-dom';
import './ProfileCard.css';
import { getStorage } from '../../services/StorageService';

const ProfileCard = () => {
    const user = getStorage('session');

    const navigate = useNavigate('');
    const logout = () => {
        navigate('/');
        window.location.reload();
    };

    return (
        <div className="profile-card">
            <img className="profile-pic" src='icons/user.svg' alt="User" />
            <div className="profile-name">{`${user.FirstName} ${user.LastName}`}</div>
            <div className="profile-role">{`Screener | ${user.UserId}`}</div>
            <div className="profile-email">{user.email}</div>
            <div className="profile-phone">+91 99999 99999</div>

            <div className="profile-link">
                <button className="terms-btn">Terms & Conditions</button>
            </div>

            <div className="logout-section">
                <span className="version">Version : V1.01</span>
                <button className="logout-btn" onClick={logout}>Logout</button>
            </div>
        </div>
    )
}

export default ProfileCard;