import './Live.css';
import { Fragment, useEffect, useState } from "react";
import { getLiveInfoForSiteAndCamera } from "../../services/ApiService";
import Stream from "../stream/Stream";

const Live = ({ currentEvent, closeLiveDialog }) => {

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
        <Fragment>
            <div className="cam-container">
            <button onClick={() => closeLiveDialog()}>close</button>
                {cameras.map((item) => <Stream videoData={`${item.httpUrl}/`} />)}
            </div>
        </Fragment>
    )
}

export default Live;