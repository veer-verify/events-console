import './Tile.css';
import { useState, useRef, useEffect, Fragment } from 'react';
import Escalation from '../escalation/Escalation';
import Live from '../../utilities/live/Live';
import Stream from '../../utilities/stream/Stream';
import { toast } from 'react-toastify';
import { getSession, getStorage, getTimeByTimezone, isValid, setStorage, timeFormat } from '../../utilities/StorageService';
import { playSiren } from '../../utilities/ApiService';
import { useSelector } from 'react-redux';
import ErrorInfo from '../../utilities/error-info/ErrorInfo';

const Tile = ({ currentEvent, index, handleFalse, handleSuspicious }) => {
    // console.log(currentEvent)
    const monitoringData = currentEvent?.monitoringInfo;
    const session = getStorage('session');
    const customAction = getStorage('custom_action');
    const actionTags = getStorage('actionTags');

    const { sessionStore, actionStore, loaderStore } = useSelector((state) => ({
        sessionStore: state.sessionStore,
        actionStore: state.actionStore,
        loaderStore: state.loaderStore
    }));

    if (!sessionStore.data) {
        setStorage('session', session);
        setStorage('actionTags', actionTags);
    }
    if (!session) {
        setStorage('session', sessionStore.data);
        setStorage('actionTags', actionStore.data);
    }

    const [showTags, setShowTags] = useState(false);
    const [categories, setCategories] = useState([]);
    const [live, setLive] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [hoverIndex, setHoverIndex] = useState(null);
    const dialogRef = useRef(null);

    const [escalation, setEscalation] = useState(false);

    const openEscalation = () => {
        setEscalation(true);
    }

    const closeEscalation = () => {
        setEscalation(false);
    }

    const handle = (id) => {
        setStorage('custom_action', id);
        setShowTags((prev) => !prev);
        setCategories(
            actionTags.actionTagCategories
                .filter((item) => item.categoryId === id)
                .flatMap((item) => item.actionTagSubCategories)
        );
        // setShowTags(true);
        closeEscalation();
    };

    const openLiveDialog = () => {
        setShowTags(false);
        setLive(true);
    };

    const closeLiveDialog = () => setLive(false);
    const closeTags = () => setShowTags(false);

    const play = async () => {
        if (monitoringData?.audioUrl === '') return toast.warn('No URL Found!');
        setShowTags(false);
        setPlaying(true);

        const obj = {
            ...currentEvent,
            audio: true,
            sirenTime: getTimeByTimezone(currentEvent?.timezone),
        };
        currentEvent = obj;
        const res = await playSiren(monitoringData);
        if (res) {
            toast.success(res.message);
        } else {
            toast.error('Failed!');
        }
        setPlaying(false);
    };

    const [imgindex, setIndex] = useState(0);
    const [imgSrc, setImgSrc] = useState(currentEvent?.image_list[0]);

    // const isHandlingRef = useRef(false);
    // const queueRef = useRef([]);
    // const processQueue = async () => {
    //     const currentTime = getTimeByTimezone(currentEvent?.timezone);

    //     if (isHandlingRef.current) return; // already processing
    //     isHandlingRef.current = true;

    //     while (queueRef.current.length > 0) {
    //         const { currentEvent, index } = queueRef.current.shift();
    //         await handleFalse({ ...currentEvent, index, actionTagTime: currentTime });
    //     }

    //     isHandlingRef.current = false;
    // };

    const handleAction = (data) => {
        const session = getStorage('session');
        const customAction = getStorage('custom_action');
        const currentTime = getTimeByTimezone(currentEvent?.timezone);
        setStorage('sub_action', data);

        if (customAction === 1) {
            setImgSrc(null);
            handleFalse({ ...currentEvent, index, actionTagTime: currentTime });

            // queueRef.current.push({ ...currentEvent, index});
            // processQueue();
        } else {
            if (session?.userLevel !== 1) {
                openEscalation();
            } else {
                setImgSrc(null);
                handleSuspicious({
                    ...currentEvent,
                    actionTagTime: currentTime,
                    ...monitoringData,
                    index,
                });
            }
        }
        closeTags();
    };


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showTags && dialogRef.current && !dialogRef.current.contains(event.target)) {
                closeTags();
            }
        };

        if (showTags) {
            window.addEventListener('mousedown', handleClickOutside);
        }

        if (!currentEvent?.image_list || currentEvent?.image_list.length === "") return;
        // if (currentEvent?.objectName === 'DUMMY') return setImgSrc(currentEvent?.image_list[0]);

        let i = 0;
        const interval = setInterval(() => {
            setIndex(i);
            if (currentEvent?.objectName === 'DUMMY') {
                setImgSrc(currentEvent?.image_list[1]);
            } else {
                setImgSrc(currentEvent?.image_list[i]);
            }
            if (i === 5) {
                i = 0;
            } else {
                i += 1;
            }
        }, 1000);

        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
            clearInterval(interval);
        };
    }, [currentEvent, showTags]);

    // Show More / Show Less logic
    const [showAll, setShowAll] = useState(false);
    const plannedActivities = monitoringData?.plannedSiteActivities || [];
    const activitiesToShow = showAll ? plannedActivities : plannedActivities.slice(0, 1);

    const address = monitoringData?.address;
    const addressParts = [address?.area, address?.district, address?.state, address?.pin].filter(Boolean);


    const userFlow = currentEvent?.userLevelAlarmInfo?.map(item => item.user).join(" => ");

    return (
        <Fragment>
            <div className='tile'>
                {/* <p >{currentEvent?.timer}</p> */}

                {
                    currentEvent ?
                        <Fragment>
                            <div
                                className=
                                {
                                    currentEvent?.timer < 10
                                        ? 'red-blink camera-feeds'
                                        : currentEvent?.objectName === 'DUMMY'
                                            ? 'yellow-blink camera-feeds'
                                            : "camera-feeds"
                                }
                            >
                                <div className="camera">
                                    {imgSrc && <img src={imgSrc} loading='lazy' alt={`Camera Feed ${imgindex + 1}`} />}
                                </div>
                                <div className="camera">
                                    {currentEvent?.httpUrl && (
                                        <Stream key={index} streamUrl={`${currentEvent?.httpUrl}/`} />
                                    )}
                                </div>
                            </div>

                            <div className="camera-id">
                                <div style={{ position: 'relative' }} ref={dialogRef}>
                                    <button
                                        className="custom-action"
                                        onClick={() => handle(1)}
                                        disabled={isValid(currentEvent) || loaderStore.eventLoader}
                                    >
                                        <img
                                            src='icons/false.png'
                                            alt="icon"
                                            width={20}
                                            title="False Activity"
                                        />
                                    </button>
                                    <button
                                        className="custom-action"
                                        onClick={() => handle(2)}
                                        disabled={loaderStore.eventLoader}
                                    >
                                        <img
                                            src='icons/suspicious.png'
                                            alt="icon"
                                            width={20}
                                            title="Suspicious Activity"
                                        />
                                    </button>
                                    <button
                                        className="custom-action"
                                        onClick={openLiveDialog}
                                    >
                                        <img
                                            src='icons/live.png'
                                            alt="icon"
                                            width={20}
                                            title="Live"
                                        />
                                    </button>
                                    <button
                                        className={playing ? 'custom-action blink' : 'custom-action'}
                                        onClick={play}
                                        disabled={playing}
                                    >
                                        <img
                                            src='icons/siren.png'
                                            alt="icon"
                                            width={20}
                                            title="Play Siren"
                                        />
                                    </button>

                                    {showTags && (
                                        <div className="tag-grid">
                                            <p>{customAction === 1 ? 'false' : 'suspicious'}</p>
                                            <div className="tag-items">
                                                {categories.map((tag, i) => (
                                                    <button
                                                        key={i}
                                                        className="tag-button"
                                                        title={tag.subCategoryName}
                                                        style={{
                                                            border:
                                                                customAction === 1
                                                                    ? '1px solid #53BF8B'
                                                                    : '1px solid #ED3237',
                                                            backgroundColor:
                                                                hoverIndex === i
                                                                    ? customAction === 1
                                                                        ? '#53BF8B'
                                                                        : '#ED3237'
                                                                    : 'transparent',
                                                            color: hoverIndex === i ? '#ffffff' : '#000000'
                                                        }}
                                                        onMouseEnter={() => setHoverIndex(i)}
                                                        onMouseLeave={() => setHoverIndex(null)}
                                                        onClick={() => handleAction(tag)}
                                                        disabled={loaderStore.eventLoader}
                                                    >
                                                        {tag.subCategoryName}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <p>{currentEvent?.cameraId}</p>
                                <p>{currentEvent?.eventTime}</p>
                            </div>

                            <div className="store-info">
                                <p>{`${currentEvent?.siteId} - ${currentEvent?.siteName}`}</p>
                                <p>
                                    {addressParts.join(', ')}
                                </p>

                                {plannedActivities.length !== 0 &&
                                    <Fragment>
                                        {activitiesToShow.map((item, i) => (
                                            <div className="activity-box" key={i}>
                                                <div>
                                                    <strong>PLANNED SITE ACTIVITY</strong>
                                                    <br />
                                                    <span>{`${item?.plannedActivityStart} - ${item?.plannedActivityEnd}`}</span>
                                                </div>
                                                <div>
                                                    <strong>{item?.activityName}</strong>
                                                    <br />
                                                    <span>{item?.plannedActivityDescription}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {plannedActivities.length > 1 && (
                                            <button
                                                className="show-more-btn"
                                                onClick={() => setShowAll((prev) => !prev)}
                                            >
                                                {showAll ? 'Show Less' : 'Show More'}
                                            </button>
                                        )}
                                    </Fragment>
                                }
                            </div>

                            {
                                monitoringData &&
                                <div className="monitoring">
                                    <p className="monitoring-title">MONITORING INFO</p>
                                    <table>
                                        <tbody>
                                            <tr>
                                                <td><strong>Timezone</strong></td>
                                                <td>{currentEvent?.timezone}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Monitoring</strong></td>
                                                <td>{timeFormat(monitoringData)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Camera</strong></td>
                                                <td>
                                                    {monitoringData.cameras?.length && monitoringData.cameras[0]?.cameraName}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td><strong>Requirements</strong></td>
                                                <td>{monitoringData.requirements.join(", ")}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Flow</strong></td>
                                                <td>{userFlow}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            }
                        </Fragment>
                        :
                        <Fragment>
                            <ErrorInfo message={'waiting for event...'} />
                        </Fragment>
                }

                {session?.userLevel === 2 &&
                    monitoringData && monitoringData.contactDetails?.length !== 0 && (
                        <ContactInfo monitoringData={monitoringData} />
                    )}
                {session?.userLevel === 2 &&
                    monitoringData && monitoringData.lawEnforcement?.length !== 0 && (
                        <LawInfo monitoringData={monitoringData} />
                    )}
                {session?.userLevel === 2 &&
                    monitoringData && monitoringData.lawEnforcement?.length !== 0 && (
                        <DotCom monitoringData={monitoringData} />
                    )}
                {escalation && (
                    <div className="escalation-container">
                        <Escalation
                            closeEscalation={closeEscalation}
                            currentEvent={currentEvent}
                            index={index}
                            handleFalse={handleFalse}
                            handleSuspicious={handleSuspicious}
                            monitoringData={monitoringData}
                        />
                    </div>
                )}
            </div>

            {live && <Live currentEvent={currentEvent} closeLiveDialog={closeLiveDialog} />}
        </Fragment>
    );
};

export default Tile;


// =============================
// Contact Info Component
// =============================
export const ContactInfo = ({ monitoringData }) => {
    return (
        <div className="contacts-container">
            <p className="monitoring-title">ESCALATION CONTACT</p>
            <div className="cards-wrapper">
                {monitoringData && monitoringData.escalation?.map((item, index) => (
                    <div className="contact-card" key={index}>
                        <div className="card-header">
                            <strong>{item.name}</strong>
                            <div className="icons">
                                <span title="Call">📞</span>
                                <span title="Message">🗨️</span>
                                <span title="Email">📧</span>
                            </div>
                        </div>
                        <div className="card-body">
                            <p>{item.emailId}</p>
                            <p>{item.contactNo}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// =============================
// Law Info Component
// =============================
export const LawInfo = ({ monitoringData }) => {
    return (
        <div className="contacts-container">
            <p className="monitoring-title">
                CONTACT LAW ENFORCEMENT IN THE EVENT OF AN EMERGENCY?
            </p>
            <div className="cards-wrapper">
                {monitoringData && monitoringData.lawEnforcement?.map((item, index) => (
                    <div className="contact-card" key={index}>
                        <div className="law-card">

                            <p>📞</p>
                            <div>
                                <p>{item.lawEnforcementDescription}</p>
                                <p>{item.lawEnforcementContact}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// =============================
// Law Info Component
// =============================
export const DotCom = ({ monitoringData }) => {
    return (
        <div className="contacts-container">
            <p className="monitoring-title">
                800.COM
            </p>
            <div className="cards-wrapper">
                {monitoringData && monitoringData.smsDetails?.map((item, index) => (
                    <div className="contact-card" key={index}>
                        <div className="law-card">
                            <p>🗨️</p>
                            <div>
                                <p>{item.smsCameras}</p>
                                <p>{item.sms800dotComNo}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
