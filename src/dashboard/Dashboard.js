import './Dashboard.css';
import { createContext, Fragment, useContext, useEffect, useRef, useState } from 'react';
import Header from '../header/Header';
import Tile from './tile/Tile';
import { getSession, getStorage, getTimeByTimezone, setStorage } from '../utilities/StorageService';
import { aliveUser, consumeConsoleEvents, getActionTagCategories, getMonitoringInfo, getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue, writetoRedisQueueData } from '../utilities/ApiService';
import { useDispatch, useSelector } from 'react-redux';
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      "image_list": [],
      "timer": 20
    }
  ];

  // const EventContext = createContext();
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
    consumeConsoleEvents({ userId: 0, eventTime: [item.eventTime], consoleType: '' });

    const filtered = eventData.filter((_, i) => index !== i);
    const filteredMonitoring = monitoringData.filter((_, i) => index !== i);
    const isFirst = index === 0;
    const reordered = isFirst ? [...dummy, ...filtered] : [...filtered, ...dummy];
    setEventData(reordered);
    const eventResponse = await getVmsEventsQueueData();
    if (eventResponse && eventResponse.length) {
      const [first] = eventResponse;
      const event = {
        ...first,
        landingTime: getTimeByTimezone(first.timezone),
        audioPlayed: false,
        timer: 120,
      };

      writetoRedisQueueData({ userId: 0, level: "", queueInfo: event, consoleType: '', queueName: '' });
      const updated = isFirst ? [event, ...filtered] : [...filtered, event];
      const data = await getMonitoringInfo(event);
      const updatedMonitoring = isFirst ? [data, ...filteredMonitoring] : [...filteredMonitoring, data];
      setMonitoringData(updatedMonitoring);
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
    write2VmsDispatchQueue(
      { ...item, ...{ actionTag: customAction }, ...{ subActionTag: subAction?.subCategoryId }, ...{ queue_name: item?.nextQueueName } }
    );
    consumeConsoleEvents({ userId: 0, eventTime: [item.eventTime], consoleType: '' });

    const filtered = eventData.filter((_, i) => index !== i);
    const filteredMonitoring = monitoringData.filter((_, i) => index !== i);
    const isFirst = index === 0;
    const reordered = isFirst ? [...dummy, ...filtered] : [...filtered, ...dummy];
    setEventData(reordered);
    const eventResponse = await getVmsEventsQueueData();
    if (eventResponse.length) {
      const [first] = eventResponse;
      const event = {
        ...first,
        landingTime: getTimeByTimezone(first.timezone),
        audioPlayed: false,
        timer: 120,
      };


      writetoRedisQueueData({ userId: 0, level: "", queueInfo: event, consoleType: '', queueName: '' });
      const updated = isFirst ? [event, ...filtered] : [...filtered, event];
      const monitoringRes = await getMonitoringInfo(event);
      const latestMonitoringData = isFirst ? [monitoringRes, ...filteredMonitoring] : [...filteredMonitoring, monitoringRes];
      setMonitoringData(latestMonitoringData);
      setEventData(updated);

    } else {
      setEventData(filtered);
    }
  }


  /**
   * event
   */
  useEffect(() => {
    let isMounted = true;
    let timerId = null;
    let isFetching = false; // prevent overlap

    const fetchEvents = async () => {
      if (!isMounted || isFetching) return;
      if (eventData.length >= 2) return; // already have 2 events

      isFetching = true;

      const response = await getVmsEventsQueueData();

      if (!isMounted) return;
      if (response && response.length !== 0) {
        const [rawEvent] = response;
        const event = {
          ...rawEvent,
          landingTime: getTimeByTimezone(rawEvent.timezone),
          audioPlayed: false,
          timer: 120,
        };

        writetoRedisQueueData({
          userId: 0,
          level: "",
          queueInfo: event,
          consoleType: "",
          queueName: "",
        });
        const monitoringInfo = await getMonitoringInfo(event);
        if (isMounted) {
          setMonitoringData(prev => [...prev, monitoringInfo]);
        }
        setEventData(prev => [...prev, event]);
      }

      isFetching = false;
      if (isMounted && eventData.length < 2) {
        timerId = setTimeout(fetchEvents, 2000);
      }
    };

    fetchEvents();

    const fetchTags = async () => {
      const tags = await getActionTagCategories();
      setStorage("actionTags", tags);
      dispatch(saveAction(tags));
    };
    fetchTags();

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [eventData.length, dispatch]);


  useEffect(() => {
    aliveUser();
    const interval = setInterval(aliveUser, 60000);
    return () => clearInterval(interval);
  }, []);


  /**
   * timed-out event handling
  */
  useEffect(() => {
    const session = getStorage('session');
    if (session.userLevel !== 1 || eventData.length === 0) return;

    const handle = async (item) => {
      const index = getStorage('index');
      const customAction = getStorage('custom_action');
      const subAction = getStorage('sub_action');

      item?.userLevelAlarmInfo?.push(
        {
          level: session?.userLevel,
          user: session?.UserId,
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
      write2VmsDispatchQueue(
        { ...item, ...{ actionTag: customAction }, ...{ subActionTag: subAction?.subCategoryId }, ...{ queue_name: 'time-out' } }
      );
      consumeConsoleEvents(
        { userId: 0, eventTime: [item.eventTime], consoleType: '' }
      );

      const filtered = eventData.filter((_, i) => index !== i);
      const filteredMonitoring = monitoringData.filter((_, i) => index !== i);
      const isFirst = index === 0;
      const reordered = isFirst ? [...dummy, ...filtered] : [...filtered, ...dummy];
      setEventData(reordered);
      const eventResponse = await getVmsEventsQueueData();
      if (eventResponse && eventResponse.length) {
        const [first] = eventResponse;
        const event = {
          ...first,
          landingTime: getTimeByTimezone(first.timezone),
          audioPlayed: false,
          timer: 120,
        };
        writetoRedisQueueData({ userId: 0, level: "", queueInfo: event, consoleType: '', queueName: '' });
        const updated = isFirst ? [event, ...filtered] : [...filtered, event];
        const monitoringRes = await getMonitoringInfo(event);
        const latestMonitoringData = isFirst ? [monitoringRes, ...filteredMonitoring] : [...filteredMonitoring, monitoringRes];
        setMonitoringData(latestMonitoringData);
        setEventData(updated);
      } else {
        setEventData(filtered);
      }
    }

    let firstInter = null;
    const interval = setInterval(() => {
      for (let i = 0; i < eventData.length; i++) {
        const item = eventData[i];
        i === 0 ? item.timer-- : setTimeout(() => item.timer--, 3000)

        if (item.timer === 0) {
          setStorage('custom_action', 2);
          setStorage('index', i);
          handle(item);
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(firstInter);
    };
  }, [dummy, eventData, monitoringData]);

  return (
    <Fragment>
      <Header></Header>

      <div className='tiles'>
        {eventData.length
          ?
          eventData.map((item, i) => (
            <Tile
              key={i}
              index={i}
              currentEvent={item}
              monitoringData={monitoringData[i]}

              escalation={escalation}
              openEscalation={openEscalation}
              closeEscalation={closeEscalation}

              handleFalse={handleFalse}
              handleSuspicious={handleSuspicious}
            />
          ))
          :
          <p className='no-event'>no events</p>
        }
      </div>

      <Reload />
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