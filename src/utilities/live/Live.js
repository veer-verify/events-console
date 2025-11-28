import './Live.css';
import { Fragment, useEffect, useState, useRef } from "react";
import Stream from "../stream/Stream";
import { getLiveInfoForSiteAndCamera } from '../ApiService';

const Live = ({ currentEvent, closeLiveDialog }) => {

    const [cameras, setCameras] = useState([]);
    const liveRef = useRef(null);
    const pos = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

    useEffect(() => {
        const getLive = async () => {
            const response = await getLiveInfoForSiteAndCamera(currentEvent);
            if(response) {
                setCameras(response);
            }
        }
        getLive();

        return () => {
            setCameras([]);
        };
    }, [currentEvent]);

    // normalCapture(item,i){

    // }

     const handleMouseDown = (e) => {
        const element = liveRef.current;
        if (!element) return;

        pos.current.offsetX = e.clientX - element.offsetLeft;
        pos.current.offsetY = e.clientY - element.offsetTop;

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e) => {
        const element = liveRef.current;
        if (!element) return;

        element.style.left = `${e.clientX - pos.current.offsetX}px`;
        element.style.top = `${e.clientY - pos.current.offsetY}px`;
    };

    const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    };

    return (
        <Fragment>
            <div className="cam-container" ref={liveRef}
                onMouseDown={handleMouseDown}>
            <div className="header">
                <p>{currentEvent?.siteName}</p>
                <button  onClick={() => { closeLiveDialog()}}>x</button>
            </div>
                <div className='cameras'>
                    { cameras && cameras.map((item, i) => <Stream key={i} streamUrl={`${item.httpUrl}/`} screenshot={true} currentCamera={item}/>     )}
                </div>
            </div>
        </Fragment>
    )
}

export default Live;