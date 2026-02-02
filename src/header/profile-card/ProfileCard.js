import './ProfileCard.css';
import { useLogout } from '../../utilities/hooks/logout';
import Swal from "sweetalert2";
import { useDispatch } from 'react-redux';
import { handleApiForLogout } from '../../utilities/slices/actionTagSlice';
import { getStorage } from '../../utilities/services/StorageService';


const ProfileCard = ({ eventData }) => {
    const user = getStorage('session');
    const logout = useLogout();
    const dispatch = useDispatch();

    const handle = () => {
        if (eventData.length !== 0) {
            return Swal.fire({
                title: "Warning!",
                text: "Please clear events before logout",
                icon: "warning",
                showConfirmButton: true,
                showCancelButton: true,
                confirmButtonText: "Yes",
            }).then((res) => {
                if (res.isConfirmed) {
                    dispatch(handleApiForLogout(true));
                }
            });
        }

        logout();
    }


    return (
        <div className="profile-card">
            <img className="profile-pic" src='icons/user.svg' alt="User" />
            <div className="profile-name">{`${user.FirstName} ${user.LastName}`}</div>
            <div className="profile-role">{`${user.UserId}`}</div>
            <div className="profile-email">{user.email}</div>
            {/* <div className="profile-phone">+91 99999 99999</div> */}

            {/* <div className="profile-link">
                <button className="terms-btn">Terms & Conditions</button>
            </div> */}

            <div className="logout-section">
                <span className="version">Version : V1.01</span>
                <button className="logout-btn" onClick={handle} >Logout</button>
            </div>
        </div>
    )
}

export default ProfileCard;