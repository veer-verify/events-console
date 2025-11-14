import './Tile.css';
import { useState, useRef, useEffect, Fragment } from 'react';
import Escalation from '../escalation/Escalation';
import Live from '../../utilities/live/Live';
import Stream from '../../utilities/stream/Stream';
import { toast } from 'react-toastify';
import { getSession, getStorage, getTimeByTimezone, setStorage, timeFormat } from '../../utilities/StorageService';
import { playSiren } from '../../utilities/ApiService';
import { useSelector } from 'react-redux';

const Tile = ({ currentEvent, index, monitoringData, handleFalse, handleSuspicious, escalation, openEscalation, closeEscalation }) => {
    const session = getStorage('session');
    const eventIndex = getStorage('index');
    const customAction = getStorage('custom_action');
    const actionTags = getStorage('actionTags');

    const { sessionStore, actionStore } = useSelector((state) => ({
        sessionStore: state.sessionStore,
        actionStore: state.actionStore
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

    const handle = (id) => {
        setStorage('custom_action', id);
        setStorage('index', index);
        setShowTags(false);
        setCategories(
            actionTags.actionTagCategories
                .filter((item) => item.categoryId === id)
                .flatMap((item) => item.actionTagSubCategories)
        );
        setShowTags(true);
    };

    const openLiveDialog = () => {
        setShowTags(false);
        setLive(true);
    };

    const closeLiveDialog = () => setLive(false);
    const closeTags = () => setShowTags(false);

    const play = async () => {
        if (monitoringData.audioUrl === '') return toast.warn('No URL Found!');
        setShowTags(false);
        setPlaying(true);
        currentEvent.audio = true;
        currentEvent.sirenTime = getTimeByTimezone(currentEvent.timezone);
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

    const handleAction = (data) => {
        const session = getStorage('session');
        const customAction = getStorage('custom_action');
        const currentTime = getTimeByTimezone(currentEvent?.timezone);
        setStorage('sub_action', data);

        if (customAction === 1) {
            setImgSrc(null);
            handleFalse({ ...currentEvent, actionTagTime: currentTime });
        } else {
            if (session?.userLevel !== 1) {
                openEscalation();
            } else {
                setImgSrc(null);
                handleSuspicious({
                    ...currentEvent,
                    actionTagTime: currentTime,
                    ...monitoringData
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

        if (!currentEvent?.image_list || currentEvent?.image_list.length === 0) return;

        if (currentEvent?.objectName === 'DUMMY')
            return setImgSrc(currentEvent?.image_list[0]);

        let i = 0;
        const interval = setInterval(() => {
            setIndex(i);
            setImgSrc(currentEvent?.image_list[i]);
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

    return (
        <Fragment>
            <div className='tile'>
                {/* <p >{currentEvent?.timer}</p> */}
                <div className={currentEvent?.objectName === 'DUMMY' ? 'yellow-blink camera-feeds' : currentEvent?.timer < 10 ? 'red-blink camera-feeds' : "camera-feeds"}>
                    <div className="camera">
                        {imgSrc && <img src={imgSrc} alt={`Camera Feed ${imgindex + 1}`} />}
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
                            disabled={currentEvent?.siteId === 0 || !monitoringData}
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
                            disabled={currentEvent?.siteId === 0 || !monitoringData}
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
                            disabled={currentEvent?.siteId === 0}
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
                    <p>Tadepally, Guntur District, Andhra Pradesh, INDIA - 500503</p>

                    {plannedActivities.length > 0 && (
                        <>
                            {activitiesToShow.map((item, i) => (
                                <div className="activity-box" key={i}>
                                    <div>
                                        <strong>PLANNED SITE ACTIVITY</strong>
                                        <br />
                                        <span>{`${item?.fromdatetime} - ${item?.todatetime}`}</span>
                                    </div>
                                    <div>
                                        <strong>{item?.activityName}</strong>
                                        <br />
                                        <span>{item?.description}</span>
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
                        </>
                    )}
                </div>

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
                                    {monitoringData?.cameras?.length &&
                                        monitoringData.cameras[0].cameraName}
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Requirements</strong></td>
                                <td>{monitoringData?.requirements}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {getSession().userLevel === 2 && monitoringData?.escalation?.length !== 0 && (
                    <ContactInfo monitoringData={monitoringData} />
                )}
                {getSession().userLevel === 2 &&
                    monitoringData?.lawEnforcement?.length !== 0 && (
                        <LawInfo monitoringData={monitoringData} />
                    )}
                {escalation && eventIndex === index && (
                    <div className="escalation-container">
                        <Escalation
                            closeEscalation={closeEscalation}
                            currentEvent={currentEvent}
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
                                <p>{item.zoneName}</p>
                                <p>{item.contact}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
