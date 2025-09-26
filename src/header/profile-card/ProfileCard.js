import { Link } from 'react-router-dom';
import './ProfileCard.css';

const ProfileCard = () => {
    return (
        <div className="profile-card">
            <img className="profile-pic" src='icons/user.svg' alt="User" />
            <div className="profile-name">Full Name</div>
            <div className="profile-role">Screener | Emp ID</div>
            <div className="profile-email">nameSurname@email.com</div>
            <div className="profile-phone">+91 99999 99999</div>

            <div className="profile-link">
                <button className="terms-btn">Terms & Conditions</button>
            </div>

            <div className="logout-section">
                <span className="version">Version : V1.01</span>
                <Link to='/'>
                    <button className="logout-btn">Logout</button>
                </Link>
            </div>
        </div>
    )
}

export default ProfileCard;