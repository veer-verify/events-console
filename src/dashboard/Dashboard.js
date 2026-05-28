import './Dashboard.css';
import { Fragment, useEffect, useRef, useState } from 'react';
import Header from '../header/Header';
import Tile from './tile/Tile';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { saveAction, handleApiForConfig } from '../../src/utilities/slices/actionTagSlice';
import { setLoader } from '../utilities/slices/loaderSlice';
import { useLogout } from '../utilities/hooks/logout';
import Swal from "sweetalert2";
import { getSession, getStorage, getTimeByTimezone, setStorage } from '../utilities/services/StorageService';
import { aliveUser, consumeConsoleEvents, getActionTagCategories, getMonitoringInfo, getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue, writetoRedisQueueData } from '../utilities/services/ApiService';

const MAX_VISIBLE_EVENTS = 2;

const Dashboard = () => {
  const dispatch = useDispatch();
  const { sessionStore, actionStore } = useSelector((state) => ({
    sessionStore: state.sessionStore,
    actionStore: state.actionStore,
  }), shallowEqual);

  const session = getStorage('session');
  const tempAction = getStorage('actionTags');
  const metadata = getStorage('metadata');
  const [timeout] = metadata?.filter((item) => item.typeName === 'Event_Console_TimeOut_Time') ?? [];
  const [timerData] = timeout?.metadata ?? [];

  // if (!sessionStore.data) {
  //   setStorage('session', session);
  //   setStorage('actionTags', tempAction);
  // }
  // if (!session) {
  //   setStorage('session', sessionStore.data);
  //   setStorage('actionTags', actionStore.data)
  // }

  const [eventData, setEventData] = useState([]);
  const [config, setConfig] = useState(false);
  const [count, setCount] = useState(MAX_VISIBLE_EVENTS);
  const logout = useLogout();


  /**
   * to handle false activity
   */
  const updateEvent = async (item) => {
    const subAction = getStorage('sub_action');
    const customAction = getStorage('custom_action');

    item?.userLevelAlarmInfo?.push(
      {
        level: getSession()?.userLevel,
        user: getSession()?.UserId,
        userName: getSession()?.UserName,
        alarm: item.audioStatus,
        activityDetTime: item.activityDetTime ?? '',
        landingTime: item?.landingTime ?? '',
        reviewStart: item?.landingTime ?? '',
        reviewEnd: getTimeByTimezone(item?.timezone),
        actionTag: customAction,
        subActionTag: subAction?.subCategoryId,
        alertTag: parseInt(item?.alertTypeId),
        subAlertTag: parseInt(item?.alertSubTypeId),
        notes: item.notes ?? '',
        actionsTakenInfo: (session?.userLevel === 1 || session?.userLevel === 3) ? (item?.actionsTaken ?? []).map(({ editing, ...rest }) => rest) : []

      }
    );
    updateEventFullDetails({ ...item, actionTag: customAction, subActionTag: subAction?.subCategoryId });
    consumeConsoleEvents({ ...item, userId: 0, eventTime: [item.eventTime], consoleType: '' });

    // if (actionStore.isLogoutClicked) {
    //   setEventData(filtered);
    //   if (eventData.length === 1) {
    //     logout();
    //   }
    //   return;
    // }

    if (actionStore.isConfigOpened) {
      setEventData(prev => removeCompletedEvent(prev, item, item.index));
      if (eventData.length === 1) {
        setConfig((prev) => prev = !prev);
      }
      return;
    }

    setEventData(prev => markEventPending(prev, item, item.index));

    dispatch(setLoader(true));
    const eventResponse = await getVmsEventsQueueData();
    if (eventResponse && eventResponse.length) {
      const [first] = eventResponse;
      const monitoringInfo = await getMonitoringInfo(first);
      const event = {
        ...first,
        monitoringInfo,
        landingTime: getTimeByTimezone(first.timezone),
        audioStatus: 'N',
        timer: Number(timerData?.value) ?? 60,
      };
      writetoRedisQueueData(event);
      setEventData(prev => replaceCompletedEvent(prev, item, event, item.index, count));
      dispatch(setLoader(false));
    } else {
      setEventData(prev => removeCompletedEvent(prev, item, item.index));
      dispatch(setLoader(false));
    }
  };


  /**
   * to handel suspicious activity
   */
  const writeToVms = async (item) => {
    const customAction = getStorage('custom_action');
    const subAction = getStorage('sub_action');

    item?.userLevelAlarmInfo?.push(
      {
        level: getSession()?.userLevel,
        user: getSession()?.UserId,
        userName: getSession()?.UserName,
        alarm: item.audioStatus,
        activityDetTime: item.activityDetTime ?? '',
        landingTime: item?.landingTime ?? '',
        reviewStart: item?.landingTime ?? '',
        reviewEnd: getTimeByTimezone(item?.timezone),
        actionTag: customAction,
        subActionTag: subAction?.subCategoryId,
        alertTag: parseInt(item?.alertTypeId),
        subAlertTag: parseInt(item?.alertSubTypeId),
        notes: item.notes ?? '',
        actionsTakenInfo: (session?.userLevel === 1 || session?.userLevel === 3) ? (item?.actionsTaken ?? []).map(({ editing, ...rest }) => rest) : []
      }
    );
    write2VmsDispatchQueue({ ...item, actionTag: customAction, subActionTag: subAction?.subCategoryId, queue_name: item?.nextQueueName });
    consumeConsoleEvents({ ...item, userId: 0, eventTime: [item.eventTime], consoleType: '' });

    // if (actionStore.isLogoutClicked) {
    //   setEventData(filtered);
    //   if (eventData.length === 1) {
    //     logout()
    //   }
    //   return;
    // }

    if (actionStore.isConfigOpened) {
      setEventData(prev => removeCompletedEvent(prev, item, item.index));
      if (eventData.length === 1) {
        setConfig((prev) => prev = !prev);
      }
      return;
    }


    setEventData(prev => markEventPending(prev, item, item.index));


    dispatch(setLoader(true));
    const eventResponse = await getVmsEventsQueueData();
    if (eventResponse && eventResponse.length) {
      const [first] = eventResponse;
      const monitoringInfo = await getMonitoringInfo(first);
      const event = {
        ...first,
        monitoringInfo,
        landingTime: getTimeByTimezone(first.timezone),
        audioStatus: 'N',
        timer: Number(timerData?.value) ?? 60,
      };

      writetoRedisQueueData(event);
      setEventData(prev => replaceCompletedEvent(prev, item, event, item.index, count));
      dispatch(setLoader(false));
    } else {
      setEventData(prev => removeCompletedEvent(prev, item, item.index));
      dispatch(setLoader(false));
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
      if (eventData.length >= count) return;
      if (actionStore.isLogoutClicked) return;
      if (actionStore.isConfigOpened) return;

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
          audioStatus: 'N',
          timer: Number(timerData?.value) ?? 60,
        };

        writetoRedisQueueData(event);
        const monitoringInfo = await getMonitoringInfo(event);
        const merged = { ...event, monitoringInfo };
        setEventData(prev => addEventWithinLimit(prev, merged, count));
      }

      isFetching = false;
      if (isMounted && eventData.length < count && !actionStore.isLogoutClicked) {
        timerId = setTimeout(fetchEvents, 2000);
      }
    };

    fetchEvents();
    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [eventData.length, dispatch, actionStore.isLogoutClicked, count, actionStore.isConfigOpened]);


  useEffect(() => {
    const fetchTags = async () => {
      const tags = await getActionTagCategories();
      if (tags?.statusCode === 200) {
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
    // if (session.queueName === 'timed-out') return;
    // if (session.queueName === 'verifai-TimedOut-CE') return;
    const [timedQueue] = metadata?.filter((item) => item.typeName === 'Event_Console_TimeOut_Queue') ?? [];
    const [queueName] = timedQueue?.metadata ?? [];
    if ((session?.queueName ?? '') === (queueName?.value ?? '')) return;
    if (session?.userLevel !== 1 || eventData.length === 0) return;

    // const processQueue = async () => {
    //   if (isHandlingRef.current) return; // already processing
    //   isHandlingRef.current = true;

    //   while (queueRef.current.length > 0) {
    //     const { item, index } = queueRef.current.shift();
    //     await handle(item, index);
    //   }

    //   isHandlingRef.current = false;
    // };

    const processQueue = async () => {
      if (isHandlingRef.current) return;

      isHandlingRef.current = true;

      try {
        while (queueRef.current.length > 0) {
          const { item, index } = queueRef.current.shift();
          await handle(item, index);
        }
      } finally {
        isHandlingRef.current = false;

        if (queueRef.current.length > 0) {
          processQueue();
        }
      }
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
        actionsTakenInfo: []
      });


      // write2VmsDispatchQueue({ ...item, actionTag: 0, subActionTag: 0, queue_name: "timed-out", });
      // write2VmsDispatchQueue({ ...item, actionTag: 0, subActionTag: 0, queue_name: "verifai-TimedOut-CE", });
      write2VmsDispatchQueue({ ...item, actionTag: 0, subActionTag: 0, queue_name: queueName?.value, });
      consumeConsoleEvents({ ...item, userId: 0, eventTime: [item.eventTime], consoleType: '' });

      // if (actionStore.isLogoutClicked) {
      //   setEventData(filtered);
      //   if (eventData.length === 1) {
      //     logout();
      //   }
      //   return;
      // }

      if (actionStore.isConfigOpened) {
        setEventData(prev => removeCompletedEvent(prev, item, index));
        if (eventData.length === 1) {
          setConfig((prev) => prev = !prev);
        }
        return;
      }

      setEventData(prev => markEventPending(prev, item, index));

      dispatch(setLoader(true));
      const eventResponse = await getVmsEventsQueueData();
      if (eventResponse && eventResponse.length) {
        const [first] = eventResponse;
        const monitoringInfo = await getMonitoringInfo(first);
        const event = {
          ...first,
          monitoringInfo,
          landingTime: getTimeByTimezone(first.timezone),
          audioStatus: 'N',
          timer: Number(timerData?.value) ?? 60,
        };

        writetoRedisQueueData(event);
        setEventData(prev => replaceCompletedEvent(prev, item, event, index, count));
        dispatch(setLoader(false));
      } else {
        setEventData(prev => removeCompletedEvent(prev, item, index));
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
  }, [actionStore.isLogoutClicked, actionStore.isConfigOpened, count, dispatch, eventData, logout, session?.UserId, session?.queueName, session?.userLevel, metadata, timerData?.value]);

  useEffect(() => {
    setEventData(prev => prev.length > count ? prev.slice(0, count) : prev);
  }, [count]);

  const handleConfig = () => {
    if (eventData.length !== 0) {
      Swal.fire({
        title: "Warning!",
        text: "Please clear events before modifying",
        icon: "warning",
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: "Ok",
      }).then((res) => {
        if (res.isConfirmed) {
          dispatch(handleApiForConfig(true));
        }
      });
    }
  }

  const handleCount = (count) => {
    setCount(count);
    dispatch(handleApiForConfig(false));
    setConfig((prev) => prev = !prev);
    const cols = count === 8 ? 4 : count === 6 ? 3 : 2;
    tileRef.current.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  }

  const closeConfig = () => {
    setConfig(false);
    dispatch(handleApiForConfig(false));
  }

  const tileRef = useRef(null);
  const visibleEventData = eventData.slice(0, count);


  const isSuperAdmin = () => {
    let a = Array.from(session?.roleList, (item) => item.category);
    return a.includes('SuperAdmin') ? true : false;
  }

  return (
    <Fragment>
      <Header eventData={visibleEventData}></Header>

      {(session?.userLevel === 1 && isSuperAdmin()) &&
        <button className='config-btn' onClick={handleConfig}>configure</button>
      }

      <div className='tiles' ref={tileRef}>
        {visibleEventData.length
          ?
          visibleEventData.map((item, i) => (
            <Tile
              key={getTileKey(item, i)}
              index={i}
              count={count}
              currentEvent={item?.__pending ? null : item}
              updateEvent={updateEvent}
              writeToVms={writeToVms}
            />
          ))
          :
          <p className='no-event'>no events</p>
        }
      </div>

      {config && <Configure handleConfig={handleConfig} handleCount={handleCount} closeConfig={closeConfig} />}

      <Reload />
    </Fragment>
  )
}

export default Dashboard;

const getEventTimeKey = (event) => {
  const eventTime = event?.eventTime;
  return eventTime === undefined || eventTime === null ? '' : String(eventTime).trim();
};

const getCameraIdKey = (event) => {
  const cameraId = event?.cameraId;
  return cameraId === undefined || cameraId === null ? '' : String(cameraId).trim();
};

const getEventIdentityKey = (event) => {
  if (!event) return '';
  if (event.__eventKey) return event.__eventKey;
  if (event.eventId !== undefined && event.eventId !== null) return `id:${event.eventId}`;

  const eventTime = getEventTimeKey(event);
  if (!eventTime) return '';
  const cameraId = getCameraIdKey(event);
  if (!cameraId) return '';

  return [
    event.siteId ?? '',
    cameraId,
    eventTime,
    event.eventType ?? '',
    event.objectName ?? '',
  ].map((value) => String(value).trim()).join('|');
};

const isSameEvent = (left, right) => {
  const leftKey = getEventIdentityKey(left);
  const rightKey = getEventIdentityKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
};

const findEventIndex = (events, event, preferredIndex = -1) => {
  if (preferredIndex >= 0 && preferredIndex < events.length && isSameEvent(events[preferredIndex], event)) {
    return preferredIndex;
  }

  return events.findIndex((item) => isSameEvent(item, event));
};

const markEventPending = (events, event, preferredIndex = -1) => {
  const targetIndex = findEventIndex(events, event, preferredIndex);
  if (targetIndex === -1) return events;

  const copy = [...events];
  copy[targetIndex] = {
    __pending: true,
    __eventKey: getEventIdentityKey(event),
  };
  return copy;
};

const removeEventAtIndex = (events, index) => {
  if (index < 0) return events;
  return events.filter((_, itemIndex) => itemIndex !== index);
};

const removeCompletedEvent = (events, event, preferredIndex = -1) => {
  const targetIndex = findEventIndex(events, event, preferredIndex);
  return removeEventAtIndex(events, targetIndex);
};

const addEventWithinLimit = (events, event, maxCount) => {
  if (hasDuplicateEventTime(events, event)) return events.slice(0, maxCount);
  if (events.length >= maxCount) return events.slice(0, maxCount);
  return [...events, event].slice(0, maxCount);
};

const replaceCompletedEvent = (events, completedEvent, nextEvent, preferredIndex = -1, maxCount = events.length) => {
  const targetIndex = findEventIndex(events, completedEvent, preferredIndex);
  if (targetIndex === -1) {
    return addEventWithinLimit(events, nextEvent, maxCount);
  }

  if (hasDuplicateEventTime(events, nextEvent, targetIndex)) {
    return removeEventAtIndex(events, targetIndex);
  }

  const copy = [...events];
  copy[targetIndex] = nextEvent;
  return copy.slice(0, maxCount);
};

const getTileKey = (event, index) => getEventIdentityKey(event) || `slot-${index}`;

const hasDuplicateEventTime = (events, event, ignoreIndex = -1) => {
  const eventTime = getEventTimeKey(event);
  if (!eventTime) return false;
  const cameraId = getCameraIdKey(event);
  if (!cameraId) return false;

  return events.some((item, index) => index !== ignoreIndex && getEventTimeKey(item) === eventTime && getCameraIdKey(item) === cameraId);
};

const Configure = ({ handleCount, closeConfig }) => {
  const layouts = [
    { id: "1x2", tiles: MAX_VISIBLE_EVENTS },
    { id: "2x2", tiles: 4 },
    { id: "2x3", tiles: 6 },
    { id: "2x4", tiles: 8 }
  ];

  // const dispatch = useDispatch();
  const session = getStorage('session');
  const [selectedLayout, setSelectedLayout] = useState(2);

  return (
    <div className="ems-container">
      {/* Header */}
      <div className="ems-header">
        <div className="ems-header-icon">⚙️</div>
        <h2 style={{ color: '#fff' }}>Event Monitoring System</h2>
      </div>

      {/* Body */}
      <div className="ems-body">
        {/* Queue Name */}
        <label className="ems-label">Queue Name - <strong>{session?.queueName}</strong></label>

        {/* Tile Layout */}
        <h3 className="ems-section-title">Tile Layout</h3>

        <div className="ems-layout-grid">
          {layouts.map((layout) => (
            <div
              key={layout.id}
              className={`ems-tile ${selectedLayout === layout.tiles ? "active" : ""
                }`}
              onClick={() => setSelectedLayout(layout.tiles)}
            >
              <div className="ems-grid-icon">▦</div>
              <strong>{layout.id}</strong>
              {/* <span>{layout.tiles} tiles</span> */}
              {selectedLayout === layout.tiles && (
                <span className="ems-dot" />
              )}
            </div>
          ))}
        </div>

        <button className='apply-btn' onClick={() => handleCount(selectedLayout)}>apply</button>
        <button className='apply-btn' onClick={closeConfig}>close</button>
      </div>
    </div>
  )
}

const Reload = () => {
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "Are you sure you want to leave this page?";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    consumeConsoleEvents({ userId: 0, consoleType: '', consumeType: 'refresh', cameraId: '', });


    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
