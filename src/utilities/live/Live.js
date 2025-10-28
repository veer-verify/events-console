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

        return () => {
            setCameras([]);
            console.log(cameras)
        };
    }, []);

    return (
        <Fragment>
            <div className="cam-container">
                <button onClick={() => { closeLiveDialog()}}>x</button>
                <div className='cameras'>
                    {cameras && cameras.map((item, i) => <Stream key={i} videoData={`${item.httpUrl}/`} />)}
                </div>
            </div>
        </Fragment>
    )
}

export default Live;