import './Dashboard.css';
import { createContext, Fragment, useContext, useEffect, useState } from 'react'
import Header from '../header/Header';
import Tile from '../utilities/tile/Tile';
import { getStorage, setStorage } from '../services/StorageService';
import { getActionTagCategories, getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue } from '../services/ApiService';


const Dashboard = () => {
  const dummy = [{
    "siteName": "Loading...",
    "siteId": "0",
    "cameraId": "Loading...",
    "objectName": "person",
    "eventTag": "",
    "eventTime": "",
    "httpUrl": "",
    "imageUrl": "",
    "images_for_event": 0,
    "timezone": "",
    "image_list": []
  }];

  const EventContext = createContext();
  const [eventData, setEventData] = useState([]);
  const [poolEvent, setPoolEvent] = useState(false);
  const [escalation, setEscalation] = useState(false);

  const closeEscalation = () => {
    setEscalation(false);
  }

  const handleEvent = async (item) => {
    const selectedAction = getStorage('id');
    const index = getStorage('index');
    const eventTag = getStorage('eventTag');

    if (selectedAction === 1) {
      write2VmsDispatchQueue({ ...item, queue_name: '2nd-level', actionTag: 'false activity', eventTag: eventTag });

      const filtered = eventData.filter((_, i) => index !== i);
      // setEventData(filtered);
      if (index === 0) {
        setEventData([...dummy, ...filtered]);
        const eventResponse = await getVmsEventsQueueData('live-events');
        setEventData([...eventResponse, ...filtered]);
      } else {
        setEventData([...filtered, ...dummy]);
        const eventResponse = await getVmsEventsQueueData('live-events');
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
    const getTags = async () => {
      const tagsResponse = await getActionTagCategories();
      setStorage('actionTags', tagsResponse);
    };

    // getEvent('live-events');
    if (eventData.length < 2) {
      getEvent('live-events');
    }
    getTags();
  }, [eventData.length]);

  return (
    <Fragment>
      <Header></Header>

      <div className='tiles'>
        {eventData.map((item, i) =>
          <EventContext.Provider value={item}>
            <Tile
              key={i}
              index={i}
              currentEvent={item}
              escalation={escalation}
              handleEvent={handleEvent}
              closeEscalation={closeEscalation}
            />

          </EventContext.Provider>
        )}
      </div>
    </Fragment>
  )
}

export default Dashboard;