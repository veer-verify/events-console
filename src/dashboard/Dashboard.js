import './Dashboard.css';
import { Fragment, useEffect, useState } from 'react'
import Header from '../header/Header';
import Tile from '../utilities/tile/Tile';
import { get, set } from '../services/StorageService';
import { getActionTagCategories, getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue } from '../services/ApiService';


const Dashboard = () => {
  const [eventData, setEventData] = useState([]);
  const [poolEvent, setPoolEvent] = useState(false);
  const [escalation, setEscalation] = useState(false);

  const closeEscalation = () => {
    setEscalation(false);
  }

  const handleEvent = async (item) => {
    const selectedAction = get('id');
    const index = get('index');
    const eventTag = get('eventTag');

    if (selectedAction === 1) {
      // eventData[index] = {
      //   "siteName": "Test",
      //   "siteId": "0",
      //   "cameraId": "0000",
      //   "objectName": "person",
      //   "eventTag": "",
      //   "eventTime": "",
      //   "httpUrl": "",
      //   "imageUrl": "",
      //   "images_for_event": 0,
      //   "timezone": "",
      //   "image_list": []
      // };
      // setEventData(eventData);

      write2VmsDispatchQueue({ ...item, queue_name: '2nd-level', actionTag: 'false activity', eventTag: eventTag });
      const eventResponse = await getVmsEventsQueueData('live-events');
      const filtered = eventData.filter((_, i) => index !== i);
      if (index === 0) {
        setEventData([...eventResponse, ...filtered]);
      } else {
        setEventData([...filtered, ...eventResponse]);
      }
    } else if (selectedAction === 2) {
      setEscalation(true);
    }
  };

  useEffect(() => {
    const getEvent = async (type) => {
      const response = await getVmsEventsQueueData(type);
      setEventData((prev) => {
        return [...prev, ...response];
      });
    };

    getEvent('live-events');

    const getTags = async () => {
      const tagsResponse = await getActionTagCategories();
      set('actionTags', tagsResponse);
    };
    getTags();
  }, []);

  return (
    <Fragment>
      <Header></Header>

      <div className='tiles'>
        {eventData.map((item, i) =>
          <Tile
            key={i}
            index={i}
            currentEvent={item}
            escalation={escalation}
            handleEvent={handleEvent}
            closeEscalation={closeEscalation}
          />)}
      </div>
    </Fragment>
  )
}

export default Dashboard;
