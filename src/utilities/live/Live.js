import './Live.css';
import { Fragment, useEffect, useState, useRef, memo } from "react";
import Stream from "../stream/Stream";
import { getLiveInfoForSiteAndCamera, getPlayback } from '../services/ApiService';

const Live = ({ currentEvent, closeLiveDialog }) => {

    const [cameras, setCameras] = useState([]);
    const [videos, setVideos] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loader, setLoader] = useState(false);

    const liveRef = useRef(null);
    const pos = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

    const handleNext = () => {
        if (currentIndex < videos.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const getCamera = (data) => {
        const event = { ...currentEvent, cameraId: data?.cameraId };
        currentEvent = event;
        console.log(currentEvent)
        const playback = async () => {
            setLoader(true)
            const response = await getPlayback(currentEvent);
            setLoader(false)
            if (response) {
                setVideos(response);
            }
        }
        playback();
    }

    useEffect(() => {
        const getLive = async () => {
            const response = await getLiveInfoForSiteAndCamera(currentEvent);
            if (response) {
                setCameras(response);
            }
        }
        getLive();

        const playback = async () => {
            setLoader(true)

            const response = await getPlayback(currentEvent);
            setLoader(false)
            if (response) {
                setVideos(response);
            }
        }
        playback();

        return () => {
            setCameras([]);
            setVideos([]);
        };
    }, [currentEvent]);


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
        <div className="cam-container" ref={liveRef} onMouseDown={handleMouseDown}>

            <div className="header">
                <p>{currentEvent?.siteName}</p>
                <button onClick={() => closeLiveDialog()}>x</button>
            </div>
            <div style={{ display: 'flex' }}>
                <div className='cameras'>
                    {cameras && cameras.map((item, i) => <Stream key={i} streamUrl={`${item.httpUrl}/`} screenshot={true} currentCamera={item} getCamera={getCamera} />)}
                </div>

                <div style={{ with: '24vw' }}>
                    <div className="video-container">
                        {!loader &&
                            <Fragment>
                                <video
                                    key={videos[currentIndex]}
                                    src={videos[currentIndex]}
                                    className="video"
                                    controls
                                    autoPlay
                                    loop
                                />

                                {/* Prev */}
                                {currentIndex > 0 && (
                                    <button className="nav-btn prev" onClick={handlePrev}>
                                        ⬅
                                    </button>
                                )}

                                {/* Next */}
                                {currentIndex < videos.length - 1 && (
                                    <button className="nav-btn next" onClick={handleNext}>
                                        ➡
                                    </button>
                                )}
                            </Fragment>
                        }
                        {loader &&
                            <Fragment>
                                <img src='gif/loading-gif.gif' alt='' style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                            </Fragment>
                        }
                    </div>
                </div>
            </div>

        </div>

    )
}

export default memo(Live);