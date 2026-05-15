import "./Tile.css";
import { useState, useRef, useEffect, Fragment, forwardRef, memo } from "react";
import Escalation from "../escalation/Escalation";
import Live from "../../utilities/live/Live";
import Stream from "../../utilities/stream/Stream";
import { toast } from "react-toastify";
import { useSelector, shallowEqual } from "react-redux";
import ErrorInfo from "../../utilities/error-info/ErrorInfo";
import { getHour, getStorage, getTimeByTimezone, getZone, isValid, setStorage, timeFormat } from "../../utilities/services/StorageService";
import { checkCameraAudio, getImagesForCameraId, loadImageWithAuth, playSiren } from "../../utilities/services/ApiService";
import dayjs from "dayjs";

const Tile = ({ currentEvent, index, count, handleFalse, handleSuspicious }) => {
  // console.log(currentEvent)
  const isManualWall = currentEvent?.eventType === "Manual_Wall";
  const isCustomEvent = currentEvent?.eventType === "Custom_Event";
  const eventTypeDotClass = isManualWall
    ? "event-type-dot manual-wall-dot"
    : isCustomEvent
      ? "event-type-dot custom-event-dot"
      : "";
  const monitoringData = currentEvent?.monitoringInfo;
  const session = getStorage("session");
  const customAction = getStorage("custom_action");
  const actionTags = getStorage("actionTags");
  const metadata = getStorage('metadata');

  const { sessionStore, actionStore, loaderStore } = useSelector((state) => ({
    sessionStore: state.sessionStore,
    actionStore: state.actionStore,
    loaderStore: state.loaderStore,
  }), shallowEqual);

  // if (!sessionStore.data) {
  //   setStorage("session", session);
  //   setStorage("actionTags", actionTags);
  // }
  // if (!session) {
  //   setStorage("session", sessionStore.data);
  //   setStorage("actionTags", actionStore.data);
  // }

  const [showTags, setShowTags] = useState(false);
  const [categories, setCategories] = useState([]);
  const [live, setLive] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [showEscalation, setShowEscalation] = useState(false);
  const dialogRef = useRef(null);

  const [showBoundaries, setShowBoundaries] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [actionsTaken, setActionsTaken] = useState([]);

  const openBoundariesDialog = () => setShowBoundaries(true);
  const closeBoundariesDialog = () => setShowBoundaries(false);

  const openMaskDialog = () => setShowMask(true);
  const closeMaskDialog = () => setShowMask(false);

  const handle = (id) => {
    setStorage("custom_action", id);
    setShowTags((prev) => !prev);
    setCategories(
      actionTags?.actionTagCategories
        ?.filter((item) => item.categoryId === id)
        .flatMap((item) => item.actionTagSubCategories)
      ?? []
    );
    // setShowTags(true);
    closeEscalation();
    closeBoundariesDialog();
    closeMaskDialog();
  };

  const openLiveDialog = () => {
    setShowTags(false);
    setLive(true);
  };

  const closeLiveDialog = () => setLive(false);
  const closeTags = () => setShowTags(false);
  const closeEscalation = () => setShowEscalation(false);

  const play = async () => {
    // if (monitoringData?.audioUrl === '') return toast.warn('No URL Found!');
    const hours = parseAudioHours(audio?.audioHours);
    const currentHour = getHour(currentEvent?.timezone);

    setShowTags(false);
    if (currentEvent) {
      currentEvent.playing = true;
    }

    const res = await playSiren(currentEvent);

    if (currentEvent) {
      currentEvent.playing = false;
      currentEvent.audioStatus =
        (audio?.audioConfigured === 'F')
          ? 'N'
          : (audio?.audioConfigured === 'T' && !hours.includes(currentHour))
            ? (res && res?.statusCode === 200 ? 'P' : 'R')
            : 'F';
      currentEvent.activityDetTime = (audio?.audioConfigured === 'T' && !hours.includes(currentHour)) ? getTimeByTimezone(currentEvent?.timezone) : '';
    }

    if (res) {
      toast.success(res.message);
    } else {
      toast.error("Failed!");
    }
  };

  const [imgindex, setIndex] = useState(0);
  const [imgSrc, setImgSrc] = useState(currentEvent?.image_list[0]);
  const [audio, setAudio] = useState('');

  const handleAction = async (data) => {
    // if (session?.userLevel === 3 && (currentEvent?.userLevelAlarmInfo?.actionsTakenInfo?.length ?? 0 < 3)) return alert('Please take nessary actions!');

    const customAction = getStorage("custom_action");
    const currentTime = getTimeByTimezone(currentEvent?.timezone);
    setStorage("sub_action", data);

    if (customAction === 1) {
      setImgSrc(null);
      handleFalse({ ...currentEvent, index, actionTagTime: currentTime, actionsTaken: [] });
    } else {
      if (session?.userLevel !== 1) {
        setShowEscalation(true);
      } else {
        if (customAction === 2 && session?.userLevel === 3) {
          if (actionsTaken.length === 0) return;
          const allChecked = actionsTaken.some((item) => item?.selected);
          if (!allChecked)
            return alert(
              'Choose at least one action, or select No Action Necessary.',
            );
        }

        const hours = parseAudioHours(audio?.audioHours);
        const currentHour = getHour(currentEvent?.timezone);

        setShowTags(false);
        if (currentEvent) {
          currentEvent.playing = true;
        }

        let res;
        if (session?.userLevel === 1) {
          if (audio?.audioConfigured === 'T' && !hours.includes(currentHour)) {
            res = await playSiren(currentEvent)
          }
        }

        if (currentEvent) {
          currentEvent.playing = false;
          currentEvent.audioStatus =
            (audio?.audioConfigured === 'F')
              ? 'N'
              : (audio?.audioConfigured === 'T' && !hours.includes(currentHour))
                ? (res && res?.statusCode === 200 ? 'P' : 'R')
                : 'F';
          currentEvent.activityDetTime = (audio?.audioConfigured === 'T' && !hours.includes(currentHour)) ? getTimeByTimezone(currentEvent?.timezone) : '';
        }

        toast.warn((audio?.audioConfigured === 'No Deterant AvailableF')
          ? 'N'
          : (audio?.audioConfigured === 'T' && !hours.includes(currentHour))
            ? (res && res?.statusCode === 200 ? 'On-site deterrent activated.' : 'Deterrent activation did not return a response.')
            : 'No Actions Necessary')

        const actions = [
          {
            name: 'Deterrent',
            selected: audio?.audioConfigured === 'T' ? true : false,
            status: audio?.audioConfigured === 'T' && !hours.includes(currentHour) && (res && res.statusCode === 200) ? true : false,
            time: audio?.audioConfigured === 'T' && !hours.includes(currentHour) ? getTimeByTimezone(currentEvent?.timezone) : null
          }
        ];
        const output = [...actionsTaken, ...actions];


        setImgSrc(null);
        handleSuspicious({
          ...currentEvent,
          index,
          actionTagTime: currentTime,
          ...monitoringData,
          actionsTaken: output
        });
      }
    }
    closeTags();
  };

  const pos = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const draggingRef = useRef(null);
  const boundaryRef = useRef(null);
  const maskRef = useRef(null);

  const handleMouseDown = (e, ref) => {
    const element = ref.current;
    if (!element) return;

    draggingRef.current = element; // set current dragging element
    pos.current.offsetX = e.clientX - element.offsetLeft;
    pos.current.offsetY = e.clientY - element.offsetTop;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const element = draggingRef.current;
    if (!element) return;

    element.style.position = "absolute"; // make sure element is positioned
    element.style.left = `${e.clientX - pos.current.offsetX}px`;
    element.style.top = `${e.clientY - pos.current.offsetY}px`;
  };

  /**
   * actions taken
   */
  useEffect(() => {
    // const [actionsTakenTypes] = metadata?.filter((item) => item.typeName === 'ActionsTaken') ?? [];
    // const actionsTakenTypes = monitoringData?.actionsTaken?.filter((item) => item?.typeName === 'ActionsTaken') ?? [];
    // console.log(actionsTakenTypes)
    setActionsTaken(() => Array.from(monitoringData?.actionsTaken ?? [], (el) => ({
      name: el.value,
      selected: el.selected ?? false,
      time: el.time ?? null,
      status: el.status ?? false,
      editing: false,
    })));

    const fetchAudio = async () => {
      const audioRes = await checkCameraAudio(currentEvent);
      if (audioRes && audioRes.statusCode === 200) {
        setAudio(audioRes)
      }
    };
    if (currentEvent) {
      fetchAudio();
    }
  }, [currentEvent]);

  useEffect(() => {
    if (currentEvent?.timer == null) return;

    if (currentEvent.timer < 2) {
      closeBoundariesDialog();
      closeMaskDialog();
    }
  }, [currentEvent?.timer]);

  const handleMouseUp = () => {
    draggingRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const iRef = useRef(1);
  const dirRef = useRef(1);
  const lastRef = useRef(0);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showTags &&
        dialogRef.current &&
        !dialogRef.current.contains(event.target)
      ) {
        closeTags();
      }
    };

    if (showTags) {
      window.addEventListener("mousedown", handleClickOutside);
    }

    if (!currentEvent?.image_list || currentEvent?.image_list.length === 0) return;
    // if (currentEvent?.objectName === 'DUMMY') return setImgSrc(currentEvent?.image_list[0]);

    const interval = setInterval(() => {
      setIndex(iRef.current);
      if (currentEvent?.objectName === "DUMMY") {
        setImgSrc(currentEvent?.image_list[1]);
      } else {
        setImgSrc(currentEvent?.image_list[iRef.current]);
      }
      if (iRef.current === currentEvent?.image_list?.length - 1) {
        iRef.current = 0;
      } else {
        iRef.current += 1;
      }
    }, 1000);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      clearInterval(interval);
    };
  }, [currentEvent, showTags]);

  const [showAll, setShowAll] = useState(false);

  const plannedActivities = monitoringData?.plannedSiteActivities || [];
  const activitiesToShow = showAll
    ? plannedActivities
    : plannedActivities.slice(0, 1);
  const address = monitoringData?.address;
  const addressParts = [
    address?.area,
    address?.district,
    address?.state,
    address?.pin,
  ].filter(Boolean);
  const contactDetails = monitoringData?.contactDetails || [];
  const lawEnforcement = monitoringData?.lawEnforcement || [];
  const smsDetails = monitoringData?.smsDetails || [];
  const userFlow = currentEvent?.userLevelAlarmInfo
    ?.map((item) => (item?.userName ? item?.userName : "Dummy"))
    .join(" - ");
  const notes = currentEvent?.userLevelAlarmInfo
    ?.map((item) => item.notes || 'None')
    .join(" - ");

  const hasSelectedNoActionNecessary = actionsTaken.some(
    (item) => item?.selected && isNoActionNecessary(item?.name)
  );

  const hasSelectedAction = actionsTaken.some(
    (item) => item?.selected && !isNoActionNecessary(item?.name)
  );

  const isActionDisabled = (item) => {
    if (isNoActionNecessary(item?.name)) return hasSelectedAction;
    return hasSelectedNoActionNecessary;
  };


  const toggleSelect = (index) => {
    const action = actionsTaken[index];
    if (isActionDisabled(action)) return;

    const isNoAction = isNoActionNecessary(action?.name);
    const updated = actionsTaken.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          status: false,
          selected: !item.selected,
          time: getTimeByTimezone(currentEvent?.timezone),
        };
      }

      if (isNoAction || isNoActionNecessary(item?.name)) {
        return {
          ...item,
          status: false,
          selected: false,
          editing: false,
        };
      }

      return item;
    });
    setActionsTaken(updated);
  };

  const toggleResponded = (index, e) => {
    e.stopPropagation();
    if (isActionDisabled(actionsTaken[index])) return;
    const updated = [...actionsTaken];
    // updated[index].responded = !updated[index].responded;
    updated[index].status = !updated[index].status;
    setActionsTaken(updated);
    // console.log(actionsTaken);
  };

  const enableEdit = (index, e) => {
    e.stopPropagation();
    if (isActionDisabled(actionsTaken[index])) return;
    const updated = [...actionsTaken];
    updated[index].editing = true;
    setActionsTaken(updated);
  };

  const updateTime = (index, value) => {
    const updated = [...actionsTaken];
    const modifiedTime = new Date(value);
    updated[index].time = dayjs(modifiedTime).format('YYYY-MM-DD HH:mm:ss');
    setActionsTaken(updated);
  };

  const saveEdit = (index, e) => {
    e.stopPropagation();
    const updated = [...actionsTaken];
    updated[index].editing = false;
    setActionsTaken(updated);
  };

  return (
    <Fragment>
      <div className="tile">
        {/* <p >{currentEvent?.timer}</p> */}
        {currentEvent ? (
          <Fragment>
            <div
              className={
                currentEvent?.timer < 10
                  ? "red-blink camera-feeds"
                  : currentEvent?.objectName === "DUMMY"
                    ? "yellow-blink camera-feeds"
                    : "camera-feeds"
              }
            >
              <div className="camera" onMouseMove={() => {
                const now = Date.now();
                if (now - lastRef.current < 300) return;

                lastRef.current = now;
                if (iRef.current === currentEvent?.image_list?.length - 1) dirRef.current = -1;
                if (iRef.current === 1) dirRef.current = 1;
                iRef.current += dirRef.current;

                setImgSrc(currentEvent?.image_list[iRef.current]);
              }}>
                {imgSrc && (
                  <img
                    src={imgSrc}
                    loading="lazy"
                    alt={`Camera Feed ${imgindex + 1}`}
                  />
                )}
              </div>
              {
                count === 2 &&
                <div className="camera">
                  {currentEvent?.httpUrl && (
                    <Stream key={index} streamUrl={`${currentEvent?.httpUrl}/`} />
                  )}
                </div>
              }
            </div>

            <div className="camera-id">
              <div className="action-buttons" ref={dialogRef}>

                {/**false activity */}
                <button
                  className="custom-action"
                  onClick={() => handle(1)}
                  disabled={isValid(currentEvent)}
                >
                  <img
                    src="icons/false.png"
                    alt="icon"
                    width={20}
                    title="False Activity"
                  />
                </button>

                {/**suspicious activity */}
                <button
                  className="custom-action"
                  onClick={() => handle(2)}
                >
                  <img
                    src="icons/suspicious.png"
                    alt="icon"
                    width={20}
                    title="Suspicious Activity"
                  />
                </button>

                <button
                  className="custom-action"
                  onClick={openLiveDialog}
                  disabled={session?.userLevel === 1}
                  style={{ opacity: session?.userLevel === 1 ? 0.5 : 1 }}
                >
                  <img
                    src="icons/live.png"
                    alt="icon"
                    width={20}
                    title="Live"
                  />
                </button>
                {/* <button
                  className="custom-action"
                  onClick={() => ''}
                >
                  <img
                    src="icons/playback.png"
                    alt="icon"
                    width={20}
                    title="Playback"
                  />
                </button> */}

                {audio && audio.audioConfigured === 'T' &&
                  <button
                    className={
                      currentEvent?.playing
                        ? "custom-action blink"
                        : "custom-action"
                    }
                    onClick={play}
                    disabled={currentEvent?.playing || audio?.audioConfigured === 'F'}
                  >
                    <img
                      src="icons/siren.png"
                      alt="icon"
                      width={20}
                      title="Play Siren"
                      disabled={audio?.audioConfigured === 'F'}
                      style={{ opacity: audio?.audioConfigured === 'F' ? 0.5 : 1 }}
                    />
                  </button>
                }


                <button
                  className="custom-action"
                  onClick={openBoundariesDialog}
                >
                  <img
                    src="icons/crop.svg"
                    alt="icon"
                    width={20}
                    title="Boundaries"
                  />
                </button>

                <button className="custom-action" onClick={openMaskDialog}>
                  <img
                    src="icons/filter.svg"
                    alt="icon"
                    width={20}
                    title="Mask-info"
                  />
                </button>

                {eventTypeDotClass && <span className={eventTypeDotClass} />}

                {showTags && (
                  <div className={count > 4 ? 'tag-grid-new' : 'tag-grid'}>
                    <p>{customAction === 1 ? "false" : "suspicious"}</p>
                    <div className="tag-items">
                      {categories?.map((tag, i) => (
                        <button
                          key={i}
                          className="tag-button"
                          title={tag.subCategoryName}
                          style={{
                            border:
                              customAction === 1
                                ? "1px solid #53BF8B"
                                : "1px solid #ED3237",
                            backgroundColor:
                              hoverIndex === i
                                ? customAction === 1
                                  ? "#53BF8B"
                                  : "#ED3237"
                                : "transparent",
                            color: hoverIndex === i ? "#ffffff" : "#000000",
                          }}
                          onMouseEnter={() => setHoverIndex(i)}
                          onMouseLeave={() => setHoverIndex(null)}
                          onClick={() => handleAction(tag)}
                          disabled={currentEvent?.playing}
                        >
                          {tag.subCategoryName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>


              {/* <div> */}
              <p>{currentEvent?.cameraId}</p>
              <p>{currentEvent?.eventTime}</p>
              {/* </div> */}

            </div>

            <div className="tile-details">
              {/**site info */}
              {count === 2 &&
                <div className="store-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    <div>
                      <p>{`${currentEvent?.siteId} - ${currentEvent?.siteName}`}</p>
                      <p>{addressParts.join(", ")}</p>
                    </div>


                    {
                      session?.userLevel === 3 &&
                      <div style={{ display: "flex", gap: "4px", userSelect: 'none' }}>
                        {actionsTaken.map((item, index) => {
                          const disabled = isActionDisabled(item);

                          return (
                            <div
                              key={index}
                              aria-disabled={disabled}
                              onClick={() => toggleSelect(index)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "20px",
                                border: item.selected ? "2px solid red" : "1px solid gray",
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.65 : 1,
                                pointerEvents: disabled ? "none" : "auto"
                              }}
                            >
                              <span style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>{item.name}</span>

                              {/* TIME VIEW */}
                              {item.selected && !item.editing && (
                                <span style={{ fontSize: '10px' }}>
                                  {" "}
                                  - {new Date(item.time).toLocaleString()}
                                  <span
                                    style={{ marginLeft: 5, cursor: "pointer" }}
                                    onClick={(e) => enableEdit(index, e)}
                                  >
                                    ✏️
                                  </span>
                                </span>
                              )}

                              {/* TIME EDIT */}
                              {item.editing && (
                                <span>
                                  <input
                                    type="datetime-local"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateTime(index, e.target.value)}
                                  />
                                  <span
                                    style={{ marginLeft: 5 }}
                                    onClick={(e) => saveEdit(index, e)}
                                  >
                                    ✔️
                                  </span>
                                </span>
                              )}

                              {/* RESPONDED */}
                              {item.selected &&
                                <span
                                  style={{ marginLeft: 4, fontSize: '12px' }}
                                  onClick={(e) => toggleResponded(index, e)}
                                >
                                  {item.status ? "✅" : "⚪"}
                                </span>
                              }

                            </div>
                          );
                        })}
                      </div>
                    }
                  </div>

                  {plannedActivities.length !== 0 && (
                    <Fragment>
                      {activitiesToShow.map((item, i) => (
                        <div className="activity-box" key={i}>
                          <div>
                            <strong>PLANNED SITE ACTIVITY</strong>
                            <br />
                            <span>{`${item?.plannedActivityStart} - ${item?.plannedActivityEnd}`}</span>
                          </div>
                          <div>
                            <strong>{item?.activityName}</strong>
                            <br />
                            <span>{item?.plannedActivityDescription}</span>
                          </div>
                        </div>
                      ))}

                      {plannedActivities.length > 1 && (
                        <button
                          className="show-more-btn"
                          onClick={() => setShowAll((prev) => !prev)}
                        >
                          {showAll ? "Show Less" : "Show More"}
                        </button>
                      )}
                    </Fragment>
                  )}
                </div>
              }

              {/**monitoring info */}
              {monitoringData && count === 2 && !showEscalation && (
                <div className="monitoring">
                  <p className="monitoring-title">MONITORING INFO</p>
                  <table>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Timezone</strong>
                        </td>
                        <td>{currentEvent?.timezone} ({getZone(currentEvent?.timezone)})</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Monitoring</strong>
                        </td>
                        <td>{timeFormat(monitoringData)}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Camera</strong>
                        </td>
                        <td>
                          {monitoringData.cameras?.length &&
                            monitoringData.cameras[0]?.cameraName}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Requirements</strong>
                        </td>
                        <td>{monitoringData.requirements.join(", ")}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Info</strong>
                        </td>
                        <td>{userFlow}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Notes</strong>
                        </td>
                        <td>{notes || "None"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {session?.userLevel !== 1 && contactDetails?.length !== 0 && !showEscalation && (
                <ContactInfo contactDetails={contactDetails} />
              )}
              {session?.userLevel !== 1 && lawEnforcement?.length !== 0 && !showEscalation && (
                <LawInfo lawEnforcement={lawEnforcement} />
              )}
              {session?.userLevel !== 1 && smsDetails?.length !== 0 && !showEscalation && (
                <DotCom smsDetails={smsDetails} />
              )}

              {showEscalation && (
                <div className="escalation-container">
                  <Escalation
                    closeEscalation={closeEscalation}
                    currentEvent={currentEvent}
                    index={index}
                    handleFalse={handleFalse}
                    handleSuspicious={handleSuspicious}
                    monitoringData={monitoringData}
                    actionsTaken={actionsTaken}
                    audio={audio}
                  />
                </div>
              )}
            </div>

            {showBoundaries && (
              <BoundariesDialog
                showBoundaries={showBoundaries}
                closeBoundariesDialog={closeBoundariesDialog}
                currentEvent={currentEvent}
                onMouseDown={(e) => handleMouseDown(e, boundaryRef)}
                ref={boundaryRef}
              />
            )}
            {showMask && (
              <MaskDialog
                showMask={showMask}
                closeMaskDialog={closeMaskDialog}
                currentEvent={currentEvent}
                onMouseDown={(e) => handleMouseDown(e, maskRef)}
                ref={maskRef}
              />
            )}
          </Fragment>
        ) : (
          <Fragment>
            <ErrorInfo message={"waiting for event"} />
          </Fragment>
        )}
      </div>

      {live && (
        <Live currentEvent={currentEvent} closeLiveDialog={closeLiveDialog} />
      )}
    </Fragment>
  );
};

export default memo(Tile);

const isNoActionNecessary = (name = '') => {
  const normalizedName = name.toLowerCase().replace(/[^a-z]/g, '');
  return normalizedName.includes('noaction') && normalizedName.includes('necess');
};

const parseAudioHours = (audioHours) => {
  try {
    const parsed = JSON.parse(audioHours ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// =============================
// Monitoring Info Component
// =============================
// export const MonitoringInfo = ({ monitoringData }) => {
//     return (
//         <div className="contacts-container">
//             <p className="monitoring-title">ESCALATION CONTACT</p>
//             <div className="cards-wrapper">
//                 {contactDetails?.map((item, index) => (
//                     <div className="contact-card" key={index}>
//                         <div className="card-header">
//                             <strong>{item.name}</strong>
//                             <div className="icons">
//                                 <span title="Call">📞</span>
//                                 <span title="Message">🗨️</span>
//                                 <span title="Email">📧</span>
//                             </div>
//                         </div>
//                         <div className="card-body">
//                             <p>{item.emailId}</p>
//                             <p>{item.contactNo}</p>
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// =============================
// Contact Info Component
// =============================
export const ContactInfo = ({ contactDetails }) => {
  return (
    <div className="contacts-container">
      <p className="monitoring-title">ESCALATION CONTACT</p>
      <div className="cards-wrapper">
        {contactDetails?.map((item, index) => (
          <div className="contact-card" key={index}>
            <div className="card-header">
              <strong>{item.contactName}</strong>
              <div className="icons">
                <span title="Call">📞</span>
                <span title="Message">🗨️</span>
                <span title="Designation">👔</span>
              </div>
            </div>
            <div className="card-body">
              <p>{item.contactDesignation}</p>
              <p>{item.callNo}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================
// Law Info Component
// =============================
export const LawInfo = ({ lawEnforcement }) => {
  return (
    <div className="contacts-container">
      <p className="monitoring-title">
        CONTACT LAW ENFORCEMENT IN THE EVENT OF AN EMERGENCY?
      </p>
      <div className="cards-wrapper">
        {lawEnforcement?.map((item, index) => (
          <div className="contact-card" key={index}>
            <div className="law-card">
              <p>📞</p>
              <div>
                <p>{item.lawEnforcementDescription}</p>
                <p>{item.lawEnforcementContact}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================
// Dot Com Component
// =============================
export const DotCom = ({ smsDetails }) => {
  return (
    <div className="contacts-container">
      <p className="monitoring-title">800.COM</p>
      <div className="cards-wrapper">
        {smsDetails?.map((item, index) => (
          <div className="contact-card" key={index}>
            <div className="law-card">
              <p>🗨️</p>
              <div>
                <p>{item.smsCameras}</p>
                <p>{item.sms800dotComNo}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BoundariesDialog = forwardRef(
  (
    { showBoundaries, closeBoundariesDialog, currentEvent, onMouseDown },
    ref
  ) => {
    const [imgSrc, setImgSrc] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      const fetchImage = async () => {
        setLoading(true);
        setImgSrc(null);

        const res = await getImagesForCameraId(currentEvent);
        if (res && res?.statusCode === 200) {
          const url = res?.data?.monitoringImage;
          const base64 = await loadImageWithAuth(url);
          setImgSrc(base64);
        } else {
          setImgSrc('/icons/eyedisabled.svg')
        }


        setLoading(false);
      };

      if (showBoundaries && currentEvent) {
        fetchImage();
      }
    }, [showBoundaries, currentEvent]);

    return (
      <div className="cam-container1" ref={ref} onMouseDown={onMouseDown}>
        {/* Header */}
        <div className="header">
          <p>{currentEvent?.siteName}</p>
          <p>Boundary Image</p>
          <button onClick={closeBoundariesDialog}>x</button>
        </div>

        {/* Loader */}
        {loading && <div className="image-loader">Loading...</div>}

        {/* Image */}
        {!loading && (
          <img
            src={imgSrc}
            alt=""
            className="img-fill"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "icons/eyedisabled.svg";
            }}
          />
        )}

      </div>
    );
  }
);


export const MaskDialog = forwardRef(
  ({ showMask, closeMaskDialog, currentEvent, onMouseDown }, ref) => {
    const [imgSrc, setImgSrc] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
      const fetchImage = async () => {
        setLoading(true);
        setImgSrc(null);

        const res = await getImagesForCameraId(currentEvent);
        if (res && res?.statusCode === 200) {
          const url = res?.data?.eventsImage;
          const base64 = await loadImageWithAuth(url);
          setImgSrc(base64);
        } else {
          setImgSrc('/icons/eyedisabled.svg')
        }

        setLoading(false);
      };

      if (showMask && currentEvent) {
        fetchImage();
      }
    }, [showMask, currentEvent]);

    return (
      <div className="cam-container1" ref={ref} onMouseDown={onMouseDown}>
        {/* Header */}
        <div className="header">
          <p>{currentEvent?.siteName}</p>
          <p>Mask Image</p>
          <button onClick={closeMaskDialog}>x</button>
        </div>

        {/* Loader */}
        {loading && <div className="image-loader">Loading...</div>}

        {/* Image */}
        {!loading && (
          <img
            src={imgSrc}
            alt=""
            className="img-fill"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "icons/eyedisabled.svg";
            }}
          />
        )}
      </div>
    );
  }
);
