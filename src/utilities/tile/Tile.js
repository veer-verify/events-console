import './Tile.css';
import { useState, useRef, useEffect } from 'react';
import { Fragment } from "react/jsx-runtime";
import TagList from '../tag-list/TagList';
import SuspiciousAlert from '../escalation/Escalation';
import axios from 'axios';

const Tile = ({ eventData, index, handleEvent }) => {

      const tags = [
    {
      path: 'icons/false.png'
    },
    {
      path: 'icons/suspicious.png'
    },
    {
      path: 'icons/live.png'
    },
    {
      path: 'icons/siren.png'
    },
  ];

    
    const [event] = eventData.data;
    const [showTags, setShowTags] = useState(false);

    const handleTags = (payload) => {
        const url = 'https://usstaging.ivisecurity.com/events_data/getActionTagCategories_1_0';
        const params = new URLSearchParams();
        if (payload?.actionTagId) {
            params.append('actionTagId', payload.actionTagId)
        }
        if (payload?.userLevel) {
            params.append('userLevel', payload.userLevel)
        }

        axios.get(url, {params: params}).then((res) => {
            console.log(res);
        })
        setShowTags(!showTags);
    }

 const [imgindex, setIndex] = useState(0);
  const [imgSrc, setImgSrc] = useState(event.image_list[0]);

  useEffect(() => {
    if (!event.image_list || event.image_list.length === 0) return;

    let i = 0;
    const interval = setInterval(() => {
      // Loop through the array
      i = (i + 1) % event.image_list.length;
      setIndex(i);
      setImgSrc(event.image_list[i]);
    }, 1000); // change every 1 second

    // Cleanup on component unmount
    return () => clearInterval(interval);
  }, [event.image_list]);


    return (
        <Fragment>
            <div className='tile'>
                <div className="camera-feeds">
                        <div className="camera">
                            <img src={imgSrc} alt ={`Camera Feed ${imgindex+1}`}/>
                        </div>
                    <div className="camera">
                        <img src={imgSrc} alt ={`Camera Feed ${imgindex+1}`}/>
                    </div>
                </div>
                {/* <div className="camera">
                    <img src="images/camera.png" alt="Camera Feed 1" />
                </div>
                <div className="camera">
                    <img src="images/camera.png" alt="Camera Feed 1" />
                </div> */}

                <div className="camera-id">
                    <div>
                        {tags.map((item, i) => <img src={item.path} alt='icon' width={20} key={i} onClick={() => handleTags()} />)}
                    </div>

                    <p >{event.cameraId}</p>
                    <p>{event.eventTime}</p>
                </div>

                <div className="store-info">
                    <p>{event.siteName}</p>
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

                {showTags && <TagList item={event} tagIndex={index} handleEvent={handleEvent} handleTags={handleTags} />}
            </div>

        </Fragment>
    )
}

export default Tile;