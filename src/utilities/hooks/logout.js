import { useNavigate } from "react-router-dom";
import { clearStorage } from "../StorageService";
import { manageUserSession } from "../ApiService";
import { useDispatch, useSelector } from "react-redux";
import { setMainLoader } from "../slices/loaderSlice";
import Swal from "sweetalert2";
import { setCallApi } from "../slices/actionTagSlice";

export const useLogout = (eventData) => {
  const dispatch = useDispatch();
  const navigate = useNavigate("");

  const logout = async () => {
    // if (eventData.length !== 0) {
    //   return Swal.fire({
    //     title: "Warning!",
    //     text: "Please clear events before logout",
    //     icon: "warning",
    //     showConfirmButton: true,
    //     showCancelButton: true,
    //     confirmButtonText: "Sure",
    //   }).then((res) => {
    //     if (res.isConfirmed) {
    //       dispatch(setCallApi(false));
    //     }
    //   });
    // }

    dispatch(setMainLoader(true));
    await manageUserSession("logOut");
    dispatch(setMainLoader(false));
    clearStorage();
    navigate("/");
  };

  return logout;
};
