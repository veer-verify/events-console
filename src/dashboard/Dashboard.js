import './Dashboard.css';
import { createContext, Fragment, useContext, useEffect, useRef, useState } from 'react';
import Header from '../header/Header';
import Tile from './tile/Tile';
import { getSession, getStorage, getTimeByTimezone, setStorage } from '../utilities/StorageService';
import { aliveUser, refreshUser, consumeConsoleEvents, getActionTagCategories, getMonitoringInfo, getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue, writetoRedisQueueData } from '../utilities/ApiService';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { saveAction } from './actionTagSlice';


const Dashboard = () => {

  const { sessionStore, actionStore } = useSelector((state) => ({
    sessionStore: state.sessionStore,
    actionStore: state.actionStore
  }));
  const dispatch = useDispatch();

  const session = getStorage('session');
  const tempAction = getStorage('actionTags');

  if (!sessionStore.data) {
    setStorage('session', session);
    setStorage('actionTags', tempAction);
  }
  if (!session) {
    setStorage('session', sessionStore.data);
    setStorage('actionTags', actionStore.data)
  }

  const dummy = [
    {
      "siteName": "Loading...",
      "siteId": 0,
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
  const [monitoringData, setMonitoringData] = useState([]);
  // const [poolEvent, setPoolEvent] = useState(false);

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
        alarm: item.audio ? 'P' : 'N',
        activityDetTime: item.sirenTime ?? '',
        landingTime: item?.landingTime ?? '',
        reviewStart: item?.landingTime ?? '',
        reviewEnd: getTimeByTimezone(item?.timezone),
        actionTag: customAction,
        subActionTag: subAction?.subCategoryId,
        notes: item.notes ?? ''
      }
    );
    updateEventFullDetails(
      { ...item, ...{ actionTag: customAction }, ...{ subActionTag: subAction?.subCategoryId } }
    );

    const filtered = eventData.filter((_, i) => index !== i);

    consumeConsoleEvents({ userId: 0, eventTime:[item.eventTime], consoleType: '' });
    const filteredMonitoring = monitoringData.filter((_, i) => index !== i);
    const isFirst = index === 0;
    const reordered = isFirst ? [...dummy, ...filtered] : [...filtered, ...dummy];
    setEventData(reordered);
    const eventResponse = await getVmsEventsQueueData();
    if (eventResponse.length) {
      const [first] = eventResponse;
      first.landingTime = getTimeByTimezone(first.timezone);
      first.audioPlayed = false;
      first.timer = 60;

      writetoRedisQueueData({ userId: 0, level: "", queueInfo: first, consoleType: '', queueName: '' });
      const updated = isFirst ? [...eventResponse, ...filtered] : [...filtered, ...eventResponse];
      setEventData(updated);

      const data = await getMonitoringInfo(first);
      const updatedMonitoring = isFirst ? [data, ...filteredMonitoring] : [...filteredMonitoring, data];
      setMonitoringData(updatedMonitoring);
    } else {
      setEventData(filtered);
    }
  };

  /**
   * to handel suspicious activity
   */
  const handleSuspicious = async (item) => {
    // console.log(item)
    // const session = getStorage('session');
    const index = getStorage('index');
    const customAction = getStorage('custom_action');
    const subAction = getStorage('sub_action');

    item?.userLevelAlarmInfo?.push(
      {
        level: getSession().userLevel,
        user: getSession().UserId,
        alarm: item.audio ? 'P' : 'N',
        activityDetTime: item.sirenTime ?? '',
        landingTime: item?.landingTime ?? '',
        reviewStart: item?.landingTime ?? '',
        reviewEnd: getTimeByTimezone(item?.timezone),
        actionTag: customAction,
        subActionTag: subAction?.subCategoryId,
        notes: item.notes ?? ''
      }
    );
    await write2VmsDispatchQueue(
      { ...item, ...{ actionTag: customAction }, ...{ subActionTag: subAction?.subCategoryId }, ...{ queue_name: item?.nextQueueName } }
    );
    // if (session?.userLevel === 4) {
    //   updateEventFullDetails(
    //     { ...item, ...{ actionTag: customAction }, ...{ subActionTag: subAction?.subCategoryId } }
    //   );
    // } else {
    //   write2VmsDispatchQueue(
    //     { ...item, ...{ actionTag: customAction }, ...{ subActionTag: subAction?.subCategoryId }, ...{ queue_name: item?.nextQueueName } }
    //   );
    // }

    const filtered = eventData.filter((_, i) => index !== i);

    consumeConsoleEvents({ userId: 0, eventTime:[item.eventTime], consoleType: '' });
    const filteredMonitoring = monitoringData.filter((_, i) => index !== i);
    const isFirst = index === 0;
    const reordered = isFirst ? [...dummy, ...filtered] : [...filtered, ...dummy];
    setEventData(reordered);
    const eventResponse = await getVmsEventsQueueData();
    if (eventResponse.length) {
      const [first] = eventResponse;
      first.landingTime = getTimeByTimezone(first.timezone);
      first.audioPlayed = false;
      first.timer = 60;


      writetoRedisQueueData({ userId: 0, level: "", queueInfo: first, consoleType: '', queueName: '' });
      const updated = isFirst ? [...eventResponse, ...filtered] : [...filtered, ...eventResponse];
      setEventData(updated);

      const monitoringRes = await getMonitoringInfo(first);
      const latestMonitoringData = isFirst ? [monitoringRes, ...filteredMonitoring] : [...filteredMonitoring, monitoringRes];
      setMonitoringData(latestMonitoringData);
    } else {
      setEventData(filtered);
    }
  }

  const timerRef = useRef(null);
  useEffect(() => {
    // const session = getStorage('session');

    const getEvent = async () => {
      const response = await getVmsEventsQueueData();
      if (response && response.length) {
        const [first] = response;
        first.landingTime = getTimeByTimezone(response.timezone);
        first.audioPlayed = false;
        first.timer = 60;
        setEventData((prev) => [...prev, ...response]);
        writetoRedisQueueData({ userId: 0, level: "", queueInfo: first, consoleType: '', queueName: '' });
        const data = await getMonitoringInfo(first);
        setMonitoringData((prev) => [...prev, data]);
      } else {
        if (eventData.length < 2) {
          timerRef.current = setTimeout(() => {
            getEvent();
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
      dispatch(saveAction(tagsResponse));
    };
    getTags();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dispatch, eventData.length]);


  useEffect(() => {
    aliveUser();
    // refreshUser();
    const interval = setInterval(aliveUser, 60000);
    return () => clearInterval(interval);
  }, []);


  /**
   * timed-out event handling
   */
  useEffect(() => {
    const session = getStorage('session');

    const handleSus = async (item) => {
      const index = getStorage('index');
      const customAction = getStorage('custom_action');
      const subAction = getStorage('sub_action');

      item?.userLevelAlarmInfo?.push(
        {
          level: getSession().userLevel,
          user: getSession().UserId,
          alarm: item.audio ? 'P' : 'N',
          activityDetTime: item.sirenTime ?? '',
          landingTime: item?.landingTime ?? '',
          reviewStart: item?.landingTime ?? '',
          reviewEnd: getTimeByTimezone(item?.timezone),
          actionTag: customAction,
          subActionTag: subAction?.subCategoryId,
          notes: item.notes ?? ''
        }
      );
      await write2VmsDispatchQueue(
        { ...item, ...{ actionTag: customAction }, ...{ subActionTag: subAction?.subCategoryId }, ...{ queue_name: 'time-out' } }
      );

      const filtered = eventData.filter((_, i) => index !== i);

      consumeConsoleEvents({ userId: 0, eventTime: [item.eventTime], consoleType: '' });
      const filteredMonitoring = monitoringData.filter((_, i) => index !== i);
      const isFirst = index === 0;
      const reordered = isFirst ? [...dummy, ...filtered] : [...filtered, ...dummy];
      setEventData(reordered);
      const eventResponse = await getVmsEventsQueueData();
      if (eventResponse.length) {
        const [first] = eventResponse;
        first.landingTime = getTimeByTimezone(first.timezone);
        first.audioPlayed = false;
        first.timer = 60;


        writetoRedisQueueData({ userId: 0, level: "", queueInfo: first, consoleType: '', queueName: '' });
        const updated = isFirst ? [...eventResponse, ...filtered] : [...filtered, ...eventResponse];
        setEventData(updated);

        const monitoringRes = await getMonitoringInfo(first);
        const latestMonitoringData = isFirst ? [monitoringRes, ...filteredMonitoring] : [...filteredMonitoring, monitoringRes];
        setMonitoringData(latestMonitoringData);
      } else {
        setEventData(filtered);
      }
    }


    if (eventData.length !== 0 && session.userLevel === 1) {
      const interval = setInterval(() => {
        if(eventData[0]) {
          eventData[0].timer--;
        }
        if(eventData[1]) {
          eventData[1].timer--;
        }
        if (eventData[0]?.timer === 0) {
          setStorage('custom_action', 2);
          setStorage('index', 0);
          handleSus(eventData[0]);
        }
        if (eventData[1]?.timer === 0) {
          setStorage('custom_action', 2);
          setStorage('index', 1);
          handleSus(eventData[1]);
        }
      }, 1000)


      return () => {
        clearInterval(interval);
      };
    }
  }, [dummy, eventData, monitoringData]);

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
                monitoringData={monitoringData[0]}

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
                monitoringData={monitoringData[1]}

                escalation={escalation}
                openEscalation={openEscalation}
                closeEscalation={closeEscalation}

                handleFalse={handleFalse}
                handleSuspicious={handleSuspicious}
              />
            </Fragment>
            :
            <Fragment>
              <Tile
                key={0}
                index={0}
                currentEvent={eventData[0]}
                monitoringData={monitoringData[0]}

                escalation={escalation}
                openEscalation={openEscalation}
                closeEscalation={closeEscalation}

                handleFalse={handleFalse}
                handleSuspicious={handleSuspicious}
              />
            </Fragment>
            :
            <Fragment>
              <p className='no-event'>no events</p>
            </Fragment>
        }
        {/* </EventContext.Provider> */}
      </div>

      <Reload></Reload>
    </Fragment>
  )
}

export default Dashboard;

const Reload = () => {
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "Are you sure you want to leave this page?";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    consumeConsoleEvents({ userId: 0, consoleType: '', consumeType: 'refresh' });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}