import './Dashboard.css';
import { createContext, Fragment, useContext, useEffect, useRef, useState, useCallback } from 'react';
import Header from '../header/Header';
import Tile from './tile/Tile';
import { clearStorage, getSession, getStorage, getTimeByTimezone, setStorage } from '../utilities/StorageService';
import { aliveUser, consumeConsoleEvents, getActionTagCategories, getMonitoringInfo, getVmsEventsQueueData, updateEventFullDetails, write2VmsDispatchQueue, writetoRedisQueueData } from '../utilities/ApiService';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { saveAction, handleApiForLogout, handleApiForConfig } from '../../src/utilities/slices/actionTagSlice';
import { setLoader } from '../utilities/slices/loaderSlice';
import { useLogout } from '../utilities/hooks/logout';
import Swal from "sweetalert2";
import { useNavigate } from 'react-router-dom';
import { MyContext } from '..';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { sessionStore, actionStore } = useSelector((state) => ({
    sessionStore: state.sessionStore,
    actionStore: state.actionStore,
  }), shallowEqual);

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

  // const contexData = useContext(MyContext);
  // console.log(contexData)

  // const EventContext = createContext();
  const [eventData, setEventData] = useState([]);
  const [config, setConfig] = useState(false);
  const [count, setCount] = useState(2);
  const logout = useLogout();
  // const navigate = useNavigate("");


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
        alarm: item.audioPlayed ? 'P' : 'N',
        activityDetTime: item.activityDetTime ?? '',
        landingTime: item?.landingTime ?? '',
        reviewStart: item?.landingTime ?? '',
        reviewEnd: getTimeByTimezone(item?.timezone),
        actionTag: customAction,
        subActionTag: subAction?.subCategoryId,
        alertTag: parseInt(item?.alertTypeId),
        subAlertTag: parseInt(item?.alertSubTypeId),
        notes: item.notes ?? ''
      }
    );
    updateEventFullDetails({ ...item, actionTag: customAction, subActionTag: subAction?.subCategoryId });
    consumeConsoleEvents({ userId: 0, eventTime: [item.eventTime], consoleType: '' });

    const filtered = eventData.filter((_, i) => item?.index !== i);
    if (!actionStore.callApi) {
      setEventData(filtered);
      if (eventData.length === 1) {
        logout();
      }
      return;
    }

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
        audioPlayed: false,
        timer: 60,
      };
      writetoRedisQueueData(event);
      setEventData(prev => {
        const copy = [...prev];
        copy[item.index] = event;
        return copy;
      });
      dispatch(setLoader(false));
    } else {
      setEventData(filtered);
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
        alarm: item.audioPlayed ? 'P' : 'N',
        activityDetTime: item.activityDetTime ?? '',
        landingTime: item?.landingTime ?? '',
        reviewStart: item?.landingTime ?? '',
        reviewEnd: getTimeByTimezone(item?.timezone),
        actionTag: customAction,
        subActionTag: subAction?.subCategoryId,
        alertTag: parseInt(item?.alertTypeId),
        subAlertTag: parseInt(item?.alertSubTypeId),
        notes: item.notes ?? ''
      }
    );
    write2VmsDispatchQueue({ ...item, actionTag: customAction, subActionTag: subAction?.subCategoryId, queue_name: item?.nextQueueName });
    consumeConsoleEvents({ userId: 0, eventTime: [item.eventTime], consoleType: '' });

    const filtered = eventData.filter((_, i) => item?.index !== i);
    if (!actionStore.callApi) {
      setEventData(filtered);
      if (eventData.length === 1) {
        logout()
      }
      return;
    }

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
        audioPlayed: false,
        timer: 60,
      };

      writetoRedisQueueData(event);
      setEventData(prev => {
        const copy = [...prev];
        copy[item.index] = event;
        return copy;
      });
      dispatch(setLoader(false))
    } else {
      setEventData(filtered);
      dispatch(setLoader(false))
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
      if (!actionStore.callApi) return;
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
          audioPlayed: false,
          timer: 60,
        };

        writetoRedisQueueData(event);
        const monitoringInfo = await getMonitoringInfo(event);
        const merged = { ...event, monitoringInfo };
        setEventData(prev => [...prev, merged]);
      }

      isFetching = false;
      if (isMounted && eventData.length < count && actionStore.callApi) {
        timerId = setTimeout(fetchEvents, 2000);
      }
    };

    fetchEvents();
    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [eventData.length, dispatch, actionStore.callApi, count, actionStore.isConfigOpened]);


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
    if (session.queueName === 'timed-out') return;
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
      });

      write2VmsDispatchQueue({ ...item, actionTag: 0, subActionTag: 0, queue_name: "timed-out", });
      consumeConsoleEvents({ userId: 0, eventTime: [item.eventTime], consoleType: "", });

      const filtered = eventData.filter((_, i) => index !== i);
      if (!actionStore.callApi) {
        setEventData(filtered);
        if (eventData.length === 1) {
          logout()
        }
        return;
      }

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
          audioPlayed: false,
          timer: 60,
        };

        writetoRedisQueueData(event);
        setEventData(prev => {
          const copy = [...prev];
          copy[index] = event;
          return copy;
        });
        dispatch(setLoader(false));
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
  }, [actionStore.callApi, actionStore.isConfigOpened, dispatch, eventData, logout, session?.UserId, session.queueName, session?.userLevel]);

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
    consumeConsoleEvents({ userId: 0, consoleType: '', consumeType: 'refresh' });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}