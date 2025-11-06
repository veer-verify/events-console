import './Dashboard.css';
import { createContext, Fragment, useContext, useEffect, useRef, useState } from 'react'
import Header from '../header/Header';
import { getStorage, getTimeByTimezone, getSession, setStorage } from '../services/StorageService';
import { getActionTagCategories, getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue, writetoRedisQueueData } from '../services/ApiService';
import Tile from './tile/Tile';
import ErrorInfo from '../utilities/error-info/ErrorInfo';


const Dashboard = () => {
  const dummy = [
    {
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
    }
  ];

  const EventContext = createContext();
  const [eventData, setEventData] = useState([]);
  const [escalation, setEscalation] = useState(false);
  const [poolEvent, setPoolEvent] = useState(false);

  const openEscalation = () => {
    setEscalation(true);
  }

  const closeEscalation = () => {
    setEscalation(false);
  }

  /**
   * to handle false activity
   */
  const handleFalse = async (item) => {
    const index = getStorage('index');
    const subAction = getStorage('sub_action');
    const customAction = getStorage('custom_action');

    item?.userLevelAlarmInfo?.push(
      {
        level: getSession().userLevel,
        user: getSession().UserId,
        alarm: 'N',
        landingTime: item?.landingTime ?? '',
        reviewStart: item?.landingTime ?? '',
        reviewEnd: getTimeByTimezone(item?.timezone),
        actionTag: customAction,
        subActionTag: subAction?.subCategoryId,
        notes: ''
      }
    );
    updateEventFullDetails(
      { ...item, ...{ actionTag: customAction }, ...{ subActionTag: subAction?.subCategoryId } }
    );

    const filtered = eventData.filter((_, i) => index !== i);
    const isFirst = index === 0;
    const reordered = isFirst ? [...dummy, ...filtered] : [...filtered, ...dummy];
    setEventData(reordered);
    const eventResponse = await getVmsEventsQueueData();
    if (eventResponse.length) {
      const [first] = eventResponse;
      first.landingTime = getTimeByTimezone(first.timezone);
      first.audioPlayed = false;
      writetoRedisQueueData({ userId: 0, level: "", queueInfo: first });
      const updated = isFirst ? [...eventResponse, ...filtered] : [...filtered, ...eventResponse];
      setEventData(updated);
    } else {
      setEventData(filtered);
    }
  };


  /**
   * to handel suspicious activity
   */
  const handleSuspicious = async (item) => {
    const index = getStorage('index');
    const subAction = getStorage('sub_action');
    const customAction = getStorage('custom_action');
    item?.userLevelAlarmInfo?.push(
      {
        level: getSession().userLevel,
        user: getSession().UserId,
        alarm: 'N',
        landingTime: item?.landingTime ?? '',
        reviewStart: item?.landingTime ?? '',
        reviewEnd: getTimeByTimezone(item?.timezone),
        actionTag: customAction,
        subActionTag: subAction?.subCategoryId,
        notes: ''
      }
    );
    write2VmsDispatchQueue(
      { ...item, ...{ actionTag: customAction }, ...{ subActionTag: subAction?.subCategoryId } }
    );

    const filtered = eventData.filter((_, i) => index !== i);
    const isFirst = index === 0;
    const reordered = isFirst ? [...dummy, ...filtered] : [...filtered, ...dummy];
    setEventData(reordered);
    const eventResponse = await getVmsEventsQueueData();
    if (eventResponse.length) {
      const [first] = eventResponse;
      first.landingTime = getTimeByTimezone(first.timezone);
      first.audioPlayed = false;
      writetoRedisQueueData({ userId: 0, level: "", queueInfo: first });
      const updated = isFirst ? [...eventResponse, ...filtered] : [...filtered, ...eventResponse];
      setEventData(updated);
    } else {
      setEventData(filtered);
    }
  }

  const timerRef = useRef(null);
  useEffect(() => {
    const getEvent = async (type) => {
      const response = await getVmsEventsQueueData(type);
      if (response.length) {
        const [first] = response;
        first.landingTime = getTimeByTimezone(response.timezone);
        first.audioPlayed = false;
        setEventData((prev) => [...prev, ...response]);
        writetoRedisQueueData({ userId: 0, level: "", queueInfo: first });
      } else {
        if (eventData.length < 2) {
          timerRef.current = setTimeout(() => {
            getEvent(type);
          }, 2000);
        }
      }
    };

    if (eventData.length < 2) {
      getEvent();
    } else if (timerRef.current) {
      clearTimeout(timerRef.current);
    }



    const getTags = async () => {
      const tagsResponse = await getActionTagCategories();
      setStorage('actionTags', tagsResponse);
    };
    getTags();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [eventData.length]);

  return (
    <Fragment>
      <Header></Header>

      <div className='tiles'>
        {/* {eventData.length ? eventData.map((item, i) => */}
        {/* <EventContext.Provider value={item} key={i}> */}
        {
          eventData.length ? eventData.length >= 2 ?
            <Fragment>
              <Tile
                key={0}
                index={0}
                currentEvent={eventData[0]}

                escalation={escalation}
                openEscalation={openEscalation}
                closeEscalation={closeEscalation}

                handleFalse={handleFalse}
                handleSuspicious={handleSuspicious}
              />

              <Tile
                key={1}
                index={1}
                currentEvent={eventData[1]}

                escalation={escalation}
                openEscalation={openEscalation}
                closeEscalation={closeEscalation}

                handleFalse={handleFalse}
                handleSuspicious={handleSuspicious}
              />
            </Fragment> :
            <Fragment>
              <Tile
                key={0}
                index={0}
                currentEvent={eventData[0]}

                escalation={escalation}
                openEscalation={openEscalation}
                closeEscalation={closeEscalation}

                handleFalse={handleFalse}
                handleSuspicious={handleSuspicious}
              />
            </Fragment>
            :
            <p className='no-event'>no events</p>
        }
        {/* </EventContext.Provider> */}
      </div>
    </Fragment>
  )
}

export default Dashboard;