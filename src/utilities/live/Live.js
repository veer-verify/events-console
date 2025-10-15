import './Live.css';
import { useEffect, useState } from "react";
import { getLiveInfoForSiteAndCamera } from "../../services/ApiService";
import Stream from "../stream/Stream";

const Live = ({ currentEvent }) => {

    const [cameras, setCameras] = useState([]);


    useEffect(() => {
        const getLive = async () => {
            const response = await getLiveInfoForSiteAndCamera(currentEvent);
            setCameras(response);
        }
        getLive();

        return () => setCameras([]);
    }, [currentEvent]);

    return (
        <div className="cam-container">
            {cameras.map((item) => <Stream videoData={`${item.httpUrl}/`} />)}
        </div>
    )
}

export default Live;