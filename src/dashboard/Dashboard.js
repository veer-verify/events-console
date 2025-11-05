import './Dashboard.css';
import { createContext, Fragment, useContext, useEffect, useState } from 'react'
import Header from '../header/Header';
import { getStorage, getTimeByTimezone, getSession, setStorage } from '../services/StorageService';
import { getActionTagCategories, getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue, writetoRedisQueueData } from '../services/ApiService';
import Tile from './tile/Tile';
import ErrorInfo from '../utilities/error-info/ErrorInfo';


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

  // const session = getStorage('session');
  // console.log(session);

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
      }
    )
    updateEventFullDetails(
      { ...item, ...{ actionTag: getStorage('custom_action') }, ...{ subActionTag: getStorage('sub_action').subCategoryId } }
    );

    const filtered = eventData.filter((_, i) => getStorage('index') !== i);
    // setEventData([...dummy, ...filtered]);

    // const eventResponse = await getVmsEventsQueueData();
    // if (eventResponse.length) {
    //   const [temp] = eventResponse;
    //   writetoRedisQueueData({ userId: 0, level: '', queueInfo: temp });
    //   temp.landingTime = getTimeByTimezone(eventResponse.timezone);
    //   temp.audioPlayed = false;
    //   setEventData([...eventResponse, ...filtered]);
    // } else {
    //   setEventData((prev) => prev ? filtered : []);
    // }

    if (getStorage('index') === 0) {
      setEventData([...dummy, ...filtered]);
      const eventResponse = await getVmsEventsQueueData();
      if (eventResponse.length) {
        const [temp] = eventResponse;
        temp.landingTime = getTimeByTimezone(eventResponse.timezone);
        temp.audioPlayed = false;
        setEventData([...eventResponse, ...filtered]);
        writetoRedisQueueData({ userId: 0, level: "", queueInfo: temp });
      } else {
        setEventData((prev) => prev ? filtered : []);
      }
    } else {
      setEventData([...filtered, ...dummy]);
      const eventResponse = await getVmsEventsQueueData();
      if (eventResponse.length) {
        writetoRedisQueueData({ userId: 0, level: "", queueInfo: eventResponse[0] });
        eventResponse[0].landingTime = getTimeByTimezone(eventResponse.timezone);
        eventResponse[0].audioPlayed = false;
        setEventData([...filtered, ...eventResponse]);
      } else {
        setEventData((prev) => prev ? filtered : []);
      }
    }
  };


  /**
   * to handel suspicious activity
   */
  const handleSuspicious = async (item) => {
    write2VmsDispatchQueue(
      { ...item, ...{ actionTag: 2 }, ...{ subActionTag: getStorage('sub_action').subCategoryId } }
    );
    const filtered = eventData.filter((_, i) => getStorage('index') !== i);
    if (getStorage('index') === 0) {
      setEventData([...dummy, ...filtered]);
      const eventResponse = await getVmsEventsQueueData();
      if (eventResponse.length) {
        eventResponse[0].landingTime = getTimeByTimezone(eventResponse.timezone);
        eventResponse[0].audioPlayed = false;
        setEventData([...eventResponse, ...filtered]);
        writetoRedisQueueData({ userId: 0, level: "", queueInfo: eventResponse[0] });
      } else {
        setEventData((prev) => prev ? filtered : []);
      }
    } else {
      setEventData([...filtered, ...dummy]);
      const eventResponse = await getVmsEventsQueueData();
      if (eventResponse.length) {
        writetoRedisQueueData({ userId: 0, level: "", queueInfo: eventResponse[0] });
        eventResponse[0].landingTime = getTimeByTimezone(eventResponse.timezone);
        eventResponse[0].audioPlayed = false;
        setEventData([...filtered, ...eventResponse]);
      } else {
        setEventData((prev) => prev ? filtered : []);
      }
    }
  }

  useEffect(() => {
    let timerId;
    const getEvent = async (type) => {
      const response = await getVmsEventsQueueData(type);
      if (response.length) {
        response[0].landingTime = getTimeByTimezone(response.timezone);
        response[0].audioPlayed = false;
        setEventData((prev) => [...prev, ...response]);
        writetoRedisQueueData({ userId: 0, level: "", queueInfo: response[0] });
      } else {
        if (eventData.length < 2) {
          timerId = setTimeout(() => {
            getEvent(type);
          }, 2000);
        }
      }
    };

    if (eventData.length < 2) {
      getEvent();
    } else if (timerId) {
      clearTimeout(timerId);
    }

    const getTags = async () => {
      const tagsResponse = await getActionTagCategories();
      setStorage('actionTags', tagsResponse);
    };
    getTags();

    return () => {
      if (timerId) clearTimeout(timerId);
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