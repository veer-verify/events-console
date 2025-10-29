import './Dashboard.css';
import { createContext, Fragment, useContext, useEffect, useState } from 'react'
import Header from '../header/Header';
import { getStorage, getTimeByTimezone, getSession, setStorage } from '../services/StorageService';
import { getActionTagCategories, getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue } from '../services/ApiService';
import Tile from './tile/Tile';


const Dashboard = () => {
  const dummy = [{
    "siteName": "Loading...",
    "siteId": "0",
    "cameraId": "Loading...",
    "objectName": "Loading...",
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
    if (getStorage('custom_action') === 1 || getStorage('custom_action') === 3) {
      if (getStorage('custom_action') === 1) {
        item?.userLevelAlarmInfo?.push(
          {
            level: getSession().userLevel,
            user: getSession().UserId,
            alarm: 'N',
            landingTime: item?.landingTime ?? '',
            reviewStart: item?.landingTime ?? '',
            reviewEnd: getTimeByTimezone(item?.timezone),
            actionTag: getStorage('custom_action'),
            subActionTag: getStorage('sub_action').subCategoryId,
            notes: ''
          })
        updateEventFullDetails(
          { ...item, ...{ actionTag: getStorage('custom_action') }, ...{ subActionTag: getStorage('sub_action').subCategoryId } }
        );
      }

      const filtered = eventData.filter((_, i) => getStorage('index') !== i);
      if (getStorage('index') === 0) {
        setEventData([...dummy, ...filtered]);
        const eventResponse = await getVmsEventsQueueData();
        eventResponse[0].landingTime = getTimeByTimezone(eventResponse.timezone);
        eventResponse[0].audioPlayed = false;
        setEventData([...eventResponse, ...filtered]);
      } else {
        setEventData([...filtered, ...dummy]);
        const eventResponse = await getVmsEventsQueueData();
        eventResponse[0].landingTime = getTimeByTimezone(eventResponse.timezone);
        eventResponse[0].audioPlayed = false;
        setEventData([...filtered, ...eventResponse]);
      }
    } else if (getStorage('custom_action') === 2) {
      setEscalation(true);
    }
  };

  useEffect(() => {
    const getEvent = async (type) => {
      const response = await getVmsEventsQueueData(type);
      response[0].landingTime = getTimeByTimezone(response.timezone);
      response[0].audioPlayed = false;
      setEventData((prev) => [...prev, ...response]);
    };

    const getTags = async () => {
      const tagsResponse = await getActionTagCategories();
      setStorage('actionTags', tagsResponse);
    };

    if (eventData.length < 2) {
      getEvent();
    }
    getTags();
  }, [eventData.length]);

  return (
    <Fragment>
      <Header></Header>

      <div className='tiles'>
        {eventData.map((item, i) =>
          <EventContext.Provider value={item} key={i}>
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