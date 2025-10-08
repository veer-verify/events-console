import './Tile.css';
import { useState, useRef, useEffect } from 'react';
import { Fragment } from "react/jsx-runtime";
import TagList from '../tag-list/TagList';
import SuspiciousAlert from '../escalation/Escalation';
import axios from 'axios';
import Escalation from '../escalation/Escalation';

const Tile = ({ eventData, eventIndex, index, handleEvent, escalation, handleTag }) => {

    const tags = [
        {
            id: 1,
            path: 'icons/false.png',
            call: (data) => handleTags(data)
        },
        {
            id: 2,
            path: 'icons/suspicious.png',
            call: (data) => handleTags(data)
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


    // const [event] = eventData.data;
    const [showTags, setShowTags] = useState(false);
    const [actionTags, setActionTags] = useState([]);

    const handleTags = (payload) => {
        const url = 'https://usstaging.ivisecurity.com/events_data/getActionTagCategories_1_0';
        const params = new URLSearchParams();
        if (payload?.actionTagId) {
            params.append('actionTagId', payload.actionTagId)
        }
        if (payload?.userLevel) {
            params.append('userLevel', payload.userLevel)
        }

        axios.get(url, { params: params }).then((res) => {
            setActionTags(res.data.actionTagCategories.filter((item) => item.categoryId === payload?.id).flatMap((item) => item.actionTagSubCategories));
            console.log(actionTags)
        })
    }

    const openTags = () => {
        setShowTags(true);
    }

    const closeTags = () => {
        setActionTags(false);
    }

    const [imgindex, setIndex] = useState(0);
    const [imgSrc, setImgSrc] = useState(eventData.image_list[0]);

    useEffect(() => {
        if (!eventData.image_list || eventData.image_list.length === 0) return;

        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % eventData.image_list.length;
            setIndex(i);
            setImgSrc(eventData.image_list[i]);
        }, 1000);

        // Cleanup on component unmount
        return () => clearInterval(interval);
    }, [eventData.image_list]);


    return (
        <Fragment>
            <div className='tile'>
                <div className="camera-feeds">
                    <div className="camera">
                        <img src={imgSrc} alt={`Camera Feed ${imgindex + 1}`} />
                    </div>
                    <div className="camera">
                        <img src={imgSrc} alt={`Camera Feed ${imgindex + 1}`} />
                    </div>
                </div>

                <div className="camera-id">
                    <div>
                        {tags.map((item, i) => <img src={item?.path} alt='icon' width={20} key={i} onClick={() => { openTags(); item?.call(item); handleTag(item.id) }} />)}
                    </div>

                    <p >{eventData.cameraId}</p>
                    <p>{eventData.eventTime}</p>
                </div>

                <div className="store-info">
                    <p>{eventData.siteName}</p>
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
                    <h4>MONITORING INFO</h4>
                    <table>
                        <tbody>
                            <tr>
                                <td><strong>Timezone</strong></td>
                                <td>CST</td>
                            </tr>
                            <tr>
                                <td><strong>Monitoring</strong></td>
                                <td>
                                    Mon-Sat: 00:00 AM - 06:00 AM & 21:00 PM - 23:59 PM<br />
                                    Sun: 00:00 AM - 23:59 PM
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Camera</strong></td>
                                <td>MLD049 - C3</td>
                            </tr>
                            <tr>
                                <td><strong>Requirements</strong></td>
                                <td>Homelessness, Loitering, Suspicious activity, Trash, Break-Ins.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {(showTags && actionTags) && <TagList actionTags={actionTags} item={eventData} tagIndex={index} handleEvent={handleEvent} closeTags={closeTags} />}
                {(escalation && eventIndex === index) && <Escalation />}
            </div>

        </Fragment>
    )
}

export default Tile;