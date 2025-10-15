import './Dashboard.css';
import { Fragment, useEffect, useState } from 'react'
import Header from '../header/Header';
import Tile from '../utilities/tile/Tile';
import axios from 'axios';
import { get } from '../services/StorageService';
import { environment } from '../environment';
import { getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue } from '../services/ApiService';
import api from '../services/interceptor';


const Dashboard = () => {

  const [eventData, setEventData] = useState([]);
  const [poolEvent, setPoolEvent] = useState(false);
  const [escalation, setEscalation] = useState(false);
  const [eventIndex, setEventIndex] = useState(null);

  const getEvent = (type) => {
    const url = `${environment.events_url}/getVms_EventsQueueData_1_0/`;
    const params = new URLSearchParams();
    params.append('queue_name', 'live-events');

    setPoolEvent(true);
    axios.get(url, { params: params }).then((res) => {
      setPoolEvent(false);
      setEventIndex(null);

      setEventData((prev) => {
        return [...prev, ...res.data]
      });
    });
  };

  const closeEscalation = () => {
    setEscalation(false);
  }

  const handleEvent = async (item, index) => {
    const tag = get('id');
    const eventTag = get('eventTag');
    if (tag === 1) {
      write2VmsDispatchQueue({ ...item, queue_name: '2nd-level', actionTag: 'false activity', eventTag: eventTag });
      
      eventData[index] = {
        "siteName": "Test",
        "siteId": "0",
        "cameraId": "0000",
        "objectName": "person",
        "eventTag": "",
        "eventTime": "",
        "httpUrl": "",
        "imageUrl": "",
        "images_for_event": 0,
        "timezone": "",
        "image_list": []
      };
      setEventData(eventData);
      setEventIndex(index);
      const eventResponse = await getVmsEventsQueueData();
      setEventIndex(null);
      const filtered = eventData.filter((_, i) => index !== i);
      if (index === 0) {
        setEventData([...eventResponse, ...filtered]);
      } else {
        setEventData([...filtered, ...eventResponse]);
      }
    } else {
      setEscalation(true);
    }
  };

  useEffect(() => {
    // if (!poolEvent && eventData.length < 2) {
    //   getEvent('live-events');
    // }
    getEvent('live-events');
  }, []);

  return (
    <Fragment>
      <Header></Header>

      <div className='tiles'>
        {eventData.map((item, i) =>
          <Tile
            key={i}
            index={i}
            eventIndex={eventIndex}
            currentEvent={item}
            handleEvent={handleEvent}
            escalation={escalation}
            closeEscalation={closeEscalation}
          />)}
      </div>
    </Fragment>
  )
}

export default Dashboard;
