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
  const [count, setCount] = useState(2);
  const logout = useLogout();


  /**
   * to handle false activity
   */
  const handleFalse = async (item) => {
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

    const filtered = eventData.filter((_, i) => item?.index !== i);
    // if (actionStore.isLogoutClicked) {
    //   setEventData(filtered);
    //   if (eventData.length === 1) {
    //     logout();
    //   }
    //   return;
    // }

    if (actionStore.isConfigOpened) {
      setEventData(filtered);
      if (eventData.length === 1) {
        setConfig((prev) => prev = !prev);
      }
      return;
    }

    setEventData(prev => {
      const copy = [...prev];
      copy[item.index] = null;
      return copy;
    });

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
      setEventData(prev => {
        if (hasDuplicateEventTime(prev, event, item.index)) {
          return prev.filter(Boolean);
        }

        const copy = [...prev];
        copy[item.index] = event;
        return copy;
      });
      dispatch(setLoader(false));
    } else {
      const cleaned = filtered.filter(Boolean);
      if (cleaned.length === 0) {
        setEventData([]);
      } else {
        setEventData(cleaned);
      }
      dispatch(setLoader(false));
    }
  };


  /**
   * to handel suspicious activity
   */
  const handleSuspicious = async (item) => {
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

    const filtered = eventData.filter((_, i) => item?.index !== i);
    // if (actionStore.isLogoutClicked) {
    //   setEventData(filtered);
    //   if (eventData.length === 1) {
    //     logout()
    //   }
    //   return;
    // }

    if (actionStore.isConfigOpened) {
      setEventData(filtered);
      if (eventData.length === 1) {
        setConfig((prev) => prev = !prev);
      }
      return;
    }


    setEventData(prev => {
      const copy = [...prev];
      copy[item.index] = null;
      return copy;
    });


    dispatch(setLoader(true));
    const eventResponse = await getVmsEventsQueueData();
    if (eventResponse.length) {
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
      setEventData(prev => {
        if (hasDuplicateEventTime(prev, event, item.index)) {
          return prev.filter(Boolean);
        }

        const copy = [...prev];
        copy[item.index] = event;
        return copy;
      });
      dispatch(setLoader(false));
    } else {
      const cleaned = filtered.filter(Boolean);
      if (cleaned.length === 0) {
        setEventData([]);
      } else {
        setEventData(cleaned);
      }
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
        setEventData(prev => hasDuplicateEventTime(prev, merged) ? prev : [...prev, merged]);
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

      const filtered = eventData.filter((_, i) => index !== i);
      // if (actionStore.isLogoutClicked) {
      //   setEventData(filtered);
      //   if (eventData.length === 1) {
      //     logout();
      //   }
      //   return;
      // }

      if (actionStore.isConfigOpened) {
        setEventData(filtered);
        if (eventData.length === 1) {
          setConfig((prev) => prev = !prev);
        }
        return;
      }

      setEventData(prev => {
        const copy = [...prev];
        copy[index] = null;
        return copy;
      });

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
        setEventData(prev => {
          if (hasDuplicateEventTime(prev, event, index)) {
            return prev.filter(Boolean);
          }

          const copy = [...prev];
          copy[index] = event;
          return copy;
        });
        dispatch(setLoader(false));
      } else {
        const cleaned = filtered.filter(Boolean);
        if (cleaned.length === 0) {
          setEventData([]);
        } else {
          setEventData(cleaned);
        }
        // setEventData(filtered);
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
  }, [actionStore.isLogoutClicked, actionStore.isConfigOpened, dispatch, eventData, logout, session?.UserId, session?.queueName, session?.userLevel, metadata, timerData?.value]);

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

  return (
    <Fragment>
      <Header eventData={eventData}></Header>

      {session?.userLevel === 1 &&
        <button className='config-btn' onClick={handleConfig}>configure</button>
      }

      <div className='tiles' ref={tileRef}>
        {eventData.length
          ?
          eventData.map((item, i) => (
            <Tile
              key={i}
              index={i}
              count={count}
              currentEvent={item}
              handleFalse={handleFalse}
              handleSuspicious={handleSuspicious}
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

const hasDuplicateEventTime = (events, event, ignoreIndex = -1) => {
  const eventTime = getEventTimeKey(event);
  if (!eventTime) return false;

  return events.some((item, index) => index !== ignoreIndex && getEventTimeKey(item) === eventTime);
};

const Configure = ({ handleCount, closeConfig }) => {
  const layouts = [
    { id: "1x2", tiles: 2 },
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
