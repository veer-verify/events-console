import './Tile.css';
import { useState, useRef, useEffect } from 'react';
import { Fragment } from "react/jsx-runtime";
import TagList from '../tag-list/TagList';
import Escalation from '../escalation/Escalation';
import { get, set } from '../../services/StorageService';
import Stream from '../stream/Stream';
import { getActionTagCategories, getMonitoringInfo } from '../../services/ApiService';

const Tile = ({ currentEvent, eventIndex, index, handleEvent, escalation, closeEscalation }) => {

    const tags = [
        {
            id: 1,
            path: 'icons/false.png',
            call: async (data) => {
                set('id', 1);

                setShowTags(false);
                const tagsResponse = await getActionTagCategories(data);
                setActionTags(tagsResponse.actionTagCategories.filter((item) => item.categoryId === data?.id).flatMap((item) => item.actionTagSubCategories));
                setShowTags(true);
            }
        },
        {
            id: 2,
            path: 'icons/suspicious.png',
            call: async (data) => {
                set('id', 2);

                setShowTags(false);
                const tagsResponse = await getActionTagCategories(data);
                setActionTags(tagsResponse.actionTagCategories.filter((item) => item.categoryId === data?.id).flatMap((item) => item.actionTagSubCategories));
                setShowTags(true);
            }
        },
        {
            path: 'icons/live.png',
            call: (data) => console.log('called!')

        },
        {
            path: 'icons/siren.png',
            call: (data) => console.log('called!')

        },
    ];

    const [showTags, setShowTags] = useState(false);
    const [actionTags, setActionTags] = useState([]);
    const [monitoringData, setMonitoringData] = useState(null);
    const dialogRef = useRef(null);
    let monitoring_hours;

    const closeTags = () => {
        setShowTags(false);
    }

    const getData = async () => {
        const data = await getMonitoringInfo(currentEvent);
        setMonitoringData(data);
        console.log('Current Event', currentEvent)
        console.log('Monitoring Info', data);
    }

    const [imgindex, setIndex] = useState(0);
    const [imgSrc, setImgSrc] = useState(currentEvent?.image_list[0]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showTags && dialogRef.current && !dialogRef.current.contains(event.target)) {
                closeTags();
            }
        };
        if (showTags) {
            window.addEventListener('mousedown', handleClickOutside);
        }

        // getData();
        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showTags]);

    useEffect(() => {
        async function info_monitoring() {
            await getData();
        }
        info_monitoring();
    }, [currentEvent])

    useEffect(()=>{
        if (!currentEvent?.image_list || currentEvent?.image_list.length === 0) return;

        let i = 0;
        setImgSrc(currentEvent?.image_list[0])
        const interval = setInterval(() => {
            i = (i + 1) % currentEvent?.image_list.length;
            setIndex(i);
            setImgSrc(currentEvent?.image_list[i]);
        }, 1000);

        return clearInterval(interval);
    },[currentEvent?.image_list]);


    function timeFormat() {
        const monitoring_hours = monitoringData?.cameras[0]?.monitoringHoursDetails;
        if (!monitoring_hours) return null;

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
                    return `${String(start).padStart(2, '0')}:00 ${start < 12 ? 'AM' : 'PM'} - ${String(end).padStart(2, '0')}:00 ${end < 12 ? 'AM' : 'PM'}`;
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
                ? `${days[0][0].toUpperCase()}${days[0].slice(1)}–${days[days.length - 1][0].toUpperCase()}${days[days.length - 1].slice(1)}`
                : `${days[0][0].toUpperCase()}${days[0].slice(1)}`;

            return <span key={index}>{dayStr}: {hours}<br /></span>;
        });
    }


    return (
        <Fragment>
            <div className='tile'>
                <div className="camera-feeds">
                    <div className="camera">
                        {imgSrc ? <img src={imgSrc} alt={`Camera Feed ${imgindex + 1}`} /> : <img src='public/images/camera.png' alt='' />}
                    </div>
                    <div className="camera">
                        {currentEvent.httpUrl && <Stream videoData={`${currentEvent?.httpUrl}/`} />}
                    </div>
                </div>

                <div className="camera-id">
                    <div style={{ position: 'relative' }} ref={dialogRef}>
                        {tags.map((item, i) => <img src={item?.path} alt='icon' width={20} key={i} onClick={() => { item?.call(item) }} />)}
                        {showTags && <TagList actionTags={actionTags} handleEvent={handleEvent} closeTags={closeTags} index={index} currentEvent={currentEvent} />}
                    </div>

                    <p >{currentEvent?.cameraId}</p>
                    <p>{currentEvent?.eventTime}</p>
                </div>

                <div className="store-info">
                    <p>{currentEvent?.siteName}</p>
                    <p>Tadepally, Guntur District, Andhra Pradesh, INDIA - 500503</p>

                    <div className="activity-box">
                        <div>
                            <strong>PLAN SITE ACTIVITY</strong><br />
                            <span>31 JUL, 2025 13:30 PM - 31 JUL, 2025 14:10 PM</span>
                        </div>
                        <div>
                            <strong>Early logout</strong><br />
                            <span>Description display here Description display here Description display here</span>
                        </div>
                    </div>
                </div>

                <div className="monitoring">
                    <p className='monitoring-title'>MONITORING INFO</p>
                    <table>
                        <tbody>
                            <tr>
                                <td><strong>Timezone</strong></td>
                                <td>CST</td>
                            </tr>
                            <tr>
                                <td><strong>Monitoring</strong></td>
                                <td>
                                    {timeFormat()}
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Camera</strong></td>
                                <td>{monitoringData?.cameras[0]?.cameraName}</td>
                            </tr>
                            <tr>
                                <td><strong>Requirements</strong></td>
                                <td>Homelessness, Loitering, Suspicious activity, Trash, Break-Ins.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* {(monitoringData && monitoringData.escalation.length !== 0) && <MonitoringInfo monitoringData={monitoringData} />}
                {(monitoringData && monitoringData.lawEnforcement.length !== 0 ) && <LawInfo monitoringData={monitoringData} />} */}
                {(escalation && eventIndex === index) && <Escalation closeEscalation={closeEscalation} currentEvent={currentEvent} />}
            </div>
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