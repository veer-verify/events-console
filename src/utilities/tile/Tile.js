import './Tile.css';
import { useState, useRef, useEffect } from 'react';
import { Fragment } from "react/jsx-runtime";
import TagList from '../tag-list/TagList';
import axios from 'axios';
import Escalation from '../escalation/Escalation';
import { set } from '../../services/StorageService';

const Tile = ({ currentEvent, eventIndex, index, handleEvent, escalation, closeEscalation }) => {

    const tags = [
        {
            id: 1,
            path: 'icons/false.png',
            call: (data) => {
                set('id', 1);
                handleTags(data);
            }
        },
        {
            id: 2,
            path: 'icons/suspicious.png',
            call: (data) => {
                set('id', 2);
                handleTags(data);
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
            setShowTags(true);
        })
    }

    // const openTags = () => {
    //     setShowTags(true);
    // }

    const closeTags = () => {
        setShowTags(false);
    }

    const [imgindex, setIndex] = useState(0);
    const [imgSrc, setImgSrc] = useState(currentEvent.image_list[0]);

    useEffect(() => {
        if (!currentEvent.image_list || currentEvent.image_list.length === 0) return;

        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % currentEvent.image_list.length;
            setIndex(i);
            setImgSrc(currentEvent.image_list[i]);
        }, 1000);

        return () => clearInterval(interval);
    }, [currentEvent.image_list]);


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
                    <div style={{position: 'relative'}}>
                        {tags.map((item, i) => <img src={item?.path} alt='icon' width={20} key={i} onClick={() => { item?.call(item) }} />)}
                        {showTags && <TagList actionTags={actionTags} handleEvent={handleEvent} closeTags={closeTags} index={index} currentEvent={currentEvent} />}
                    </div>

                    <p >{currentEvent.cameraId}</p>
                    <p>{currentEvent.eventTime}</p>
                </div>

                <div className="store-info">
                    <p>{currentEvent.siteName}</p>
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

                {(escalation && eventIndex === index) && <Escalation closeEscalation={closeEscalation} />}
            </div>
        </Fragment>
    )
}

export default Tile;