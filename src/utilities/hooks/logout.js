import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setMainLoader } from "../slices/loaderSlice";
import { manageUserSession } from "../services/ApiService";
import { clearStorage } from "../services/StorageService";

export const useLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate("");

  const logout = async () => {
    try {
      dispatch(setMainLoader(true));
      await manageUserSession("logOut");
      navigate("/");
      clearStorage();
    } finally {
      dispatch(setMainLoader(false));
    }
  };

  return logout;
};
