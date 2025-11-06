import './Tile.css';
import { useState, useRef, useEffect } from 'react';
import { Fragment } from "react/jsx-runtime";
import { getStorage, getSession, setStorage, getTimeByTimezone } from '../../services/StorageService';
import { getActionTagCategories, getMonitoringInfo, playSiren } from '../../services/ApiService';
import Escalation from '../escalation/Escalation';
import Live from '../../utilities/live/Live';
import Stream from '../../utilities/stream/Stream';

const Tile = ({ currentEvent, index, monitoringData, handleFalse, handleSuspicious, escalation, openEscalation, closeEscalation }) => {
    const eventIndex = getStorage('index');
    const customAction = getStorage('custom_action');
    const actionTagsResponse = getStorage('actionTags');

    const tags = [
        {
            id: 1,
            path: 'icons/false.png',
            call: async (data) => {
                setStorage('custom_action', 1);
                setStorage('index', index);

                setShowTags(false);
                setActionTags(actionTagsResponse.actionTagCategories.filter((item) => item.categoryId === data?.id).flatMap((item) => item.actionTagSubCategories));
                setShowTags(true);
            }
        },
        {
            id: 2,
            path: 'icons/suspicious.png',
            call: async (data) => {
                setStorage('custom_action', 2);
                setStorage('index', index);

                setShowTags(false);
                setActionTags(actionTagsResponse.actionTagCategories.filter((item) => item.categoryId === data?.id).flatMap((item) => item.actionTagSubCategories));
                setShowTags(true);
            }
        },
        {
            path: 'icons/live.png',
            call: () => openLiveDialog()

        },
        {
            path: 'icons/siren.png',
            call: () => play()
        }
    ];

    const [showTags, setShowTags] = useState(false);
    const [actionTags, setActionTags] = useState([]);
    const [live, setLive] = useState(false);
    

    const dialogRef = useRef(null);

    const openLiveDialog = () => {
        setLive(true);
    }

    const closeLiveDialog = () => {
        setLive(false);
    }

    const closeTags = () => {
        setShowTags(false);
    }

    const [playing, setPlaying] = useState(false);
    const play = async () => {
        setPlaying(true);
        // currentEvent.audio = true;
        const res = await playSiren(currentEvent);
        if(res) {
            alert(res.message);
        }
        setPlaying(false);
    }

    const [imgindex, setIndex] = useState(0);
    const [imgSrc, setImgSrc] = useState(currentEvent?.image_list[0]);

    const timeFormat = () => {
        const monitoring_hours = monitoringData && monitoringData.cameras[0].monitoringHoursDetails;
        if (!monitoring_hours) return;

        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        const sortedDays = Object.keys(monitoring_hours).sort(
            (a, b) => weekdays.indexOf(a) - weekdays.indexOf(b)
        );

        const allHours = {};
        sortedDays.forEach(day => {
            const formatted = monitoring_hours[day]
                .split(',')
                .map(r => {
                    const [start, end] = r.split('-').map(Number);
                    return `${String(start).padStart(2, '0')}:00 - ${String(end).padStart(2, '0')}:00`;
                })
                .join(' & ');
            allHours[day] = formatted;
        });

        const grouped = {};
        sortedDays.forEach(day => {
            const hours = allHours[day];
            if (!grouped[hours]) grouped[hours] = [];
            grouped[hours].push(day);
        });

        return Object.entries(grouped).map(([hours, days], index) => {
            const dayStr = days.length > 1
                ? `${days[0][0].toUpperCase()}${days[0].slice(1)}-${days[days.length - 1][0].toUpperCase()}${days[days.length - 1].slice(1)}`
                : `${days[0][0].toUpperCase()}${days[0].slice(1)}`;
            return <span key={index}>{dayStr}: {hours}<br /></span>;
        });
    }

    const handleAction = (data) => {
        const currentTime = getTimeByTimezone(currentEvent?.timezone);
        setStorage('sub_action', data);
        if (getStorage('custom_action') === 1) {
            handleFalse({...currentEvent, actionTagTime: currentTime});
        } else {
            if (getSession('session').userLevel !== 1) {
                openEscalation()
            } else {
                handleSuspicious({...currentEvent, actionTagTime: currentTime});
            }
        }
        closeTags()
    }

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

        let i = 0;
        const interval = setInterval(() => {
            setIndex(i);
            setImgSrc(currentEvent?.image_list[i]);
            if (i === 5) i = 0;
            i += 1;
        }, 1000);



        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
            clearInterval(interval);
        };
    }, [currentEvent, showTags]);

    return (
        <Fragment>
            <div className='tile'>
                <div className="camera-feeds">
                    <div className="camera">
                        {imgSrc && <img src={imgSrc} alt={`Camera Feed ${imgindex + 1}`} />}
                    </div>
                    <div className="camera">
                        {currentEvent?.httpUrl && <Stream key={index} streamUrl={`${currentEvent?.httpUrl}/`} />}
                    </div>
                </div>

                <div className="camera-id">
                    <div style={{ position: 'relative' }} ref={dialogRef}>
                        {tags.map((item, i) => <img src={item?.path} alt='icon' width={20} key={i} onClick={() => item?.call(item)} />)}
                        {showTags &&
                            <div className='tag-grid'>
                                <p>{customAction === 1 ? 'false' : 'suspicious'}</p>
                                <div className="tag-items">
                                    {actionTags.map((tag, i) => (
                                        <button
                                            key={i}
                                            className='tag-button'
                                            title={tag.subCategoryName}
                                            style={{ border: customAction === 1 ? '1px solid #53BF8B' : '1px solid #ED3237' }}
                                            onClick={() => handleAction(tag)}
                                        >
                                            {tag.subCategoryName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        }
                    </div>

                    <p >{currentEvent?.cameraId}</p>
                    <p>{currentEvent?.eventTime}</p>
                </div>

                <div className="store-info">
                    <p>{currentEvent?.siteName}</p>
                    <p>Tadepally, Guntur District, Andhra Pradesh, INDIA - 500503</p>

                    {(monitoringData && monitoringData.plannedSiteActivities.length !== 0) ??

                    <div className="activity-box">
                        <div>
                            <strong>PLANNED SITE ACTIVITY</strong><br />
                                <span>
                                    {monitoringData && monitoringData.plannedSiteActivities.length && monitoringData.plannedSiteActivities[0].fromdatetime}
                                    -
                                    {monitoringData && monitoringData.plannedSiteActivities.length && monitoringData.plannedSiteActivities[0].todatetime}
                                </span>
                        </div>
                        <div>
                            <strong>Early logout</strong><br />
                            <span>{monitoringData && monitoringData.plannedSiteActivities.length && monitoringData.plannedSiteActivities[0].description}</span>
                        </div>
                    </div>
                    }

                </div>

                <div className="monitoring">
                    <p className='monitoring-title'>MONITORING INFO</p>
                    <table>
                        <tbody>
                            <tr>
                                <td><strong>Timezone</strong></td>
                                <td>{currentEvent?.timezone}</td>
                            </tr>
                            <tr>
                                <td><strong>Monitoring</strong></td>
                                <td>{ timeFormat() }</td>
                            </tr>
                            <tr>
                                <td><strong>Camera</strong></td>
                                <td>
                                    {monitoringData && monitoringData.cameras.length && monitoringData.cameras[0].cameraId}
                                    -
                                    {monitoringData && monitoringData.cameras.length && monitoringData.cameras[0].cameraName}
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Requirements</strong></td>
                                <td>{monitoringData && monitoringData.requirements}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {
                    (getSession().userLevel === 2 && monitoringData && monitoringData.escalation?.length !== 0) && <MonitoringInfo monitoringData={monitoringData} />
                }
                {
                    (getSession().userLevel === 2 && monitoringData && monitoringData.lawEnforcement?.length !== 0) && <LawInfo monitoringData={monitoringData} />
                }
                {
                    (escalation && eventIndex === index) &&
                    <div className='escalation-container'>
                        <Escalation closeEscalation={closeEscalation} currentEvent={currentEvent} handleFalse={handleFalse} handleSuspicious={handleSuspicious} />
                    </div>
                }
            </div>

            {
                live && <Live currentEvent={currentEvent} closeLiveDialog={closeLiveDialog} />
            }
        </Fragment>
    )
}

export default Tile;


export const MonitoringInfo = ({ monitoringData }) => {
    return (
        <div className="contacts-container">
            <p className='monitoring-title'>ESCALATION CONTACT</p>
            <div className="cards-wrapper">
                {monitoringData.escalation?.map((item, index) => (
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
    )
}

export const LawInfo = ({ monitoringData }) => {
    return (
        <div className="contacts-container">
            <p className='monitoring-title'>CONTACT LAW ENFORCEMENT IN THE EVENT OF AN EMERGENCY?</p>
            <div className="cards-wrapper">
                {monitoringData.lawEnforcement?.map((item, index) => (
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
    )
}