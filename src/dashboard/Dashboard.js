import './Dashboard.css';
import { createContext, Fragment, useContext, useEffect, useRef, useState, useCallback } from 'react';
import Header from '../header/Header';
import Tile from './tile/Tile';
import { getSession, getStorage, getTimeByTimezone, setStorage } from '../utilities/StorageService';
import { aliveUser, consumeConsoleEvents, getActionTagCategories, getMonitoringInfo, getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue, writetoRedisQueueData } from '../utilities/ApiService';
import { useDispatch, useSelector } from 'react-redux';
import { saveAction } from '../../src/utilities/slices/actionTagSlice';
import { setLoader } from '../utilities/slices/loaderSlice';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { sessionStore, actionStore } = useSelector((state) => ({
    sessionStore: state.sessionStore,
    actionStore: state.actionStore,
  }));

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

  // const EventContext = createContext();
  const [eventData, setEventData] = useState([]);


  /**
   * to handle false activity
   */
  const [falseQueue, setFalseQueue] = useState([]);
  const isFalseProcessing = useRef(false);

  const falseHandler = useCallback((item) => {
    setFalseQueue(prev => [...prev, item]);
  }, []);

  useEffect(() => {
    const handleFalse = async (item) => {
      const subAction = getStorage('sub_action');
      const customAction = getStorage('custom_action');

      item?.userLevelAlarmInfo?.push(
        {
          level: getSession()?.userLevel,
          user: getSession()?.UserId,
          userName: getSession()?.UserName,
          alarm: item.audioPlayed ? 'P' : 'N',
          activityDetTime: item.activityDetTime ?? '',
          landingTime: item?.landingTime ?? '',
          reviewStart: item?.landingTime ?? '',
          reviewEnd: getTimeByTimezone(item?.timezone),
          actionTag: customAction,
          subActionTag: subAction?.subCategoryId,
          notes: item.notes ?? ''
        }
      );
      updateEventFullDetails(
        { ...item, actionTag: customAction, subActionTag: subAction?.subCategoryId }
      );
      consumeConsoleEvents({ userId: 0, eventTime: [item.eventTime], consoleType: '' });

      const isFirst = item?.index === 0;

      const filtered = eventData.filter((_, i) => item?.index !== i);
      const reordered = isFirst ? [null, ...filtered] : [...filtered, null];
      setEventData(reordered);

      dispatch(setLoader(true))
      const eventResponse = await getVmsEventsQueueData();
      if (eventResponse && eventResponse.length) {
        const [first] = eventResponse;
        const monitoringInfo = await getMonitoringInfo(first);
        const event = {
          ...first,
          monitoringInfo,
          landingTime: getTimeByTimezone(first.timezone),
          audioPlayed: false,
          timer: 60,
        };

        writetoRedisQueueData(event);
        const updated = isFirst ? [event, ...filtered] : [...filtered, event];
        setEventData(updated);
        dispatch(setLoader(false))
      } else {
        setEventData(filtered);
        dispatch(setLoader(false))
      }
    };

    const runQueue = async () => {
      if (isFalseProcessing.current) return;
      if (falseQueue.length === 0) return;
      isFalseProcessing.current = true;
      const nextItem = falseQueue[0];

      await handleFalse(nextItem);
      setFalseQueue(prev => prev.slice(1));
      isFalseProcessing.current = false;
    };

    runQueue();
  }, [dispatch, eventData, falseQueue]);


  /**
   * to handel suspicious activity
   */
  const [suspiciousQueue, setSuspiciousQueue] = useState([]);
  const isSuspiciousProcessing = useRef(false);

  const suspiciousHandler = useCallback((item) => {
    setSuspiciousQueue(prev => [...prev, item]);
  }, []);

  useEffect(() => {
    const handleSuspicious = async (item) => {
      const customAction = getStorage('custom_action');
      const subAction = getStorage('sub_action');

      item?.userLevelAlarmInfo?.push(
        {
          level: getSession()?.userLevel,
          user: getSession()?.UserId,
          userName: getSession()?.UserName,
          alarm: item.audioPlayed ? 'P' : 'N',
          activityDetTime: item.activityDetTime ?? '',
          landingTime: item?.landingTime ?? '',
          reviewStart: item?.landingTime ?? '',
          reviewEnd: getTimeByTimezone(item?.timezone),
          actionTag: customAction,
          subActionTag: subAction?.subCategoryId,
          notes: item.notes ?? ''
        }
      );
      write2VmsDispatchQueue(
        { ...item, actionTag: customAction, subActionTag: subAction?.subCategoryId, queue_name: item?.nextQueueName }
      );
      consumeConsoleEvents({ userId: 0, eventTime: [item.eventTime], consoleType: '' });

      const isFirst = item?.index === 0;

      const filtered = eventData.filter((_, i) => item?.index !== i);
      const reordered = isFirst ? [null, ...filtered] : [...filtered, null];
      setEventData(reordered);
      // setEventData(eventData.splice(item.index, 1, event));
      dispatch(setLoader(true))
      const eventResponse = await getVmsEventsQueueData();
      if (eventResponse.length) {
        const [first] = eventResponse;
        const monitoringInfo = await getMonitoringInfo(first);
        const event = {
          ...first,
          monitoringInfo,
          landingTime: getTimeByTimezone(first.timezone),
          audioPlayed: false,
          timer: 60,
        };

        writetoRedisQueueData(event);
        const updated = isFirst ? [event, ...filtered] : [...filtered, event];
        setEventData(updated);
        dispatch(setLoader(false))
      } else {
        setEventData(filtered);
        dispatch(setLoader(false))
      }
    }

    const runQueue = async () => {
      if (isSuspiciousProcessing.current) return;
      if (suspiciousQueue.length === 0) return;

      isSuspiciousProcessing.current = true;
      const nextItem = suspiciousQueue[0];

      await handleSuspicious(nextItem);
      setSuspiciousQueue(prev => prev.slice(1));
      isSuspiciousProcessing.current = false;
    };

    runQueue();
  }, [dispatch, eventData, suspiciousQueue]);


  /**
   * event
   */
  useEffect(() => {
    let isMounted = true;
    let timerId = null;
    let isFetching = false; // prevent overlap

    const fetchEvents = async () => {
      if (!isMounted || isFetching) return;
      if (eventData.length >= 2) return;

      isFetching = true;

      dispatch(setLoader(true))
      const response = await getVmsEventsQueueData();
      dispatch(setLoader(false))

      if (!isMounted) return;
      if (response && response.length !== 0) {
        const [rawEvent] = response;
        const event = {
          ...rawEvent,
          landingTime: getTimeByTimezone(rawEvent.timezone),
          audioPlayed: false,
          timer: 60,
        };

        writetoRedisQueueData(event);

        const monitoringInfo = await getMonitoringInfo(event);
        const merged = { ...event, monitoringInfo };
        setEventData(prev => [...prev, merged]);
      }

      isFetching = false;
      if (isMounted && eventData.length < 2) {
        timerId = setTimeout(fetchEvents, 2000);
      }
    };

    fetchEvents();

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [eventData.length, dispatch]);



  useEffect(() => {
    const fetchTags = async () => {
      const tags = await getActionTagCategories();
      if(tags?.statusCode === 200) {
        setStorage("actionTags", tags);
        dispatch(saveAction(tags));
      }
    };

    fetchTags();

    aliveUser();
    const interval = setInterval(aliveUser, 60000);
    return () => clearInterval(interval);
  }, [dispatch]);


  /**
   * timed-out event handling
  */
  const isHandlingRef = useRef(false);
  const queueRef = useRef([]);
  useEffect(() => {
    if (session?.userLevel !== 1 || eventData.length === 0) return;

    const processQueue = async () => {
      if (isHandlingRef.current) return; // already processing
      isHandlingRef.current = true;

      while (queueRef.current.length > 0) {
        const { item, index } = queueRef.current.shift();
        await handle(item, index);
      }

      isHandlingRef.current = false;
    };

    const handle = async (item, index) => {
      item?.userLevelAlarmInfo?.push({
        level: session?.userLevel,
        user: session?.UserId,
        userName: getSession()?.UserName,
        alarm: "N",
        activityDetTime: "",
        landingTime: item?.landingTime ?? "",
        reviewStart: item?.landingTime ?? "",
        reviewEnd: getTimeByTimezone(item?.timezone),
        actionTag: 0,
        subActionTag: 0,
        notes: item?.notes ?? "",
      });

      write2VmsDispatchQueue({
        ...item,
        actionTag: 0,
        subActionTag: 0,
        queue_name: "time-out",
      });

      consumeConsoleEvents({ userId: 0, eventTime: [item.eventTime], consoleType: "", });

      const isFirst = index === 0;
      const filtered = eventData.filter((_, i) => index !== i);
      const reordered = isFirst ? [null, ...filtered] : [...filtered, null];
      setEventData(reordered);

      dispatch(setLoader(true))
      const eventResponse = await getVmsEventsQueueData();
      if (eventResponse && eventResponse.length) {
        const [first] = eventResponse;
        const monitoringInfo = await getMonitoringInfo(first);
        const event = {
          ...first,
          monitoringInfo,
          landingTime: getTimeByTimezone(first.timezone),
          audioPlayed: false,
          timer: 60,
        };

        writetoRedisQueueData(event);
        const updated = isFirst ? [event, ...filtered] : [...filtered, event];
        setEventData(updated);
        dispatch(setLoader(false))
      } else {
        setEventData(filtered);
        dispatch(setLoader(false))
      }
    };

    const interval = setInterval(() => {
      if (isHandlingRef.current) return;

      for (let i = 0; i < eventData.length; i++) {
        const item = eventData[i];

        if (item?.timer > 0) {
          item.timer--;
        }

        if (item?.timer === 0) {
          setStorage("custom_action", 2);
          queueRef.current.push({ item, index: i });
          processQueue();
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [dispatch, eventData, session?.UserId, session?.userLevel]);




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

              handleFalse={falseHandler}
              handleSuspicious={suspiciousHandler}
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