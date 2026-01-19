import "./Tile.css";
import { useState, useRef, useEffect, Fragment, forwardRef, memo } from "react";
import Escalation from "../escalation/Escalation";
import Live from "../../utilities/live/Live";
import Stream from "../../utilities/stream/Stream";
import { toast } from "react-toastify";
import {
  getSession,
  getStorage,
  getTagNameById,
  getTimeByTimezone,
  getZone,
  isValid,
  setStorage,
  timeFormat,
} from "../../utilities/StorageService";
import {
  playSiren,
  getImagesForCameraId,
  loadImageWithAuth,
  audioDisable
} from "../../utilities/ApiService";
import { useSelector, shallowEqual } from "react-redux";
import ErrorInfo from "../../utilities/error-info/ErrorInfo";

const Tile = ({ currentEvent, index, handleFalse, handleSuspicious }) => {
  // console.log(currentEvent)
  const monitoringData = currentEvent?.monitoringInfo;
  const session = getStorage("session");
  const customAction = getStorage("custom_action");
  const actionTags = getStorage("actionTags");

  const { sessionStore, actionStore, loaderStore } = useSelector((state) => ({
    sessionStore: state.sessionStore,
    actionStore: state.actionStore,
    loaderStore: state.loaderStore,
  }), shallowEqual);

  if (!sessionStore.data) {
    setStorage("session", session);
    setStorage("actionTags", actionTags);
  }
  if (!session) {
    setStorage("session", sessionStore.data);
    setStorage("actionTags", actionStore.data);
  }

  const [showTags, setShowTags] = useState(false);
  const [categories, setCategories] = useState([]);
  const [live, setLive] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [showEscalation, setShowEscalation] = useState(false);
  const dialogRef = useRef(null);

  const [showBoundaries, setShowBoundaries] = useState(false);
  const [showMask, setShowMask] = useState(false);

  const openBoundariesDialog = () => setShowBoundaries(true);
  const closeBoundariesDialog = () => setShowBoundaries(false);

  const openMaskDialog = () => setShowMask(true);
  const closeMaskDialog = () => setShowMask(false);

  const handle = (id) => {
    setStorage("custom_action", id);
    setShowTags((prev) => !prev);
    setCategories(
      actionTags?.actionTagCategories
        .filter((item) => item.categoryId === id)
        .flatMap((item) => item.actionTagSubCategories)
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
    setShowTags(false);
    if (currentEvent) {
      currentEvent.playing = true;
      currentEvent.audioPlayed = true;
      currentEvent.activityDetTime = getTimeByTimezone(currentEvent?.timezone);
    }

    const res = await playSiren(currentEvent);

    if (currentEvent) {
      currentEvent.playing = false;
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

  const handleAction = (data) => {

    const session = getStorage("session");
    const customAction = getStorage("custom_action");
    const currentTime = getTimeByTimezone(currentEvent?.timezone);
    setStorage("sub_action", data);

    if (customAction === 1) {
      setImgSrc(null);
      handleFalse({ ...currentEvent, index, actionTagTime: currentTime });
    } else {
      if (session?.userLevel !== 1) {
        setShowEscalation(true);
      } else {
        setImgSrc(null);
        handleSuspicious({
          ...currentEvent,
          index,
          actionTagTime: currentTime,
          ...monitoringData,
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

  useEffect(() => {
    const fetchAudio = async () => {
      const audioRes = await audioDisable(currentEvent);
      if (audioRes?.statusCode === 200) {
        setAudio(audioRes.audioConfigured)
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
    draggingRef.current = null; // clear dragging element
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const iRef = useRef(1);
  const dirRef = useRef(1);
  const lastRef = useRef(0);
  useEffect(() => {
    // currentEvent.image_list = [
    //   'images/background.png',
    //   'images/camera.png',
    //   'images/hide.svg',
    //   'images/verifai-logo.png',
    //   'images/camera.png',
    //   'images/hide.svg',
    // ]
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
      if (iRef.current === 5) {
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
                if (iRef.current === 5) dirRef.current = -1;
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
              <div className="camera">
                {/* {currentEvent?.httpUrl && (
                  <Stream key={index} streamUrl={`${currentEvent?.httpUrl}/`} />
                )} */}
              </div>
            </div>

            <div className="camera-id">
              <div style={{ position: "relative" }} ref={dialogRef}>
                <button
                  className="custom-action"
                  onClick={() => handle(1)}
                  disabled={isValid(currentEvent) || loaderStore.eventLoader}
                >
                  <img
                    src="icons/false.png"
                    alt="icon"
                    width={20}
                    title="False Activity"
                  />
                </button>
                <button
                  className="custom-action"
                  onClick={() => handle(2)}
                  disabled={loaderStore.eventLoader}
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
                <button
                  className={
                    currentEvent?.playing
                      ? "custom-action blink"
                      : "custom-action"
                  }
                  onClick={play}
                  disabled={currentEvent?.playing || audio === 'F'}
                >
                  <img
                    src="icons/siren.png"
                    alt="icon"
                    width={20}
                    title="Play Siren"
                    disabled={audio === 'F'}
                    style={{ opacity: audio === 'T' ? 1 : 0.5 }}
                  />
                </button>

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

                {showTags && (
                  <div className="tag-grid">
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
                          disabled={loaderStore.eventLoader}
                        >
                          {tag.subCategoryName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p>{currentEvent?.cameraId}</p>
              <p>{currentEvent?.eventTime}</p>
            </div>

            <div className="store-info">
              <p>{`${currentEvent?.siteId} - ${currentEvent?.siteName}`}</p>
              <p>{addressParts.join(", ")}</p>

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

            {monitoringData && (
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
                    {/* <tr>
                                                <td><strong>History</strong></td>
                                                { currentEvent?.userLevelAlarmInfo.map((item, i) => getTagNameById(item?.subActionTag)?.subCategoryName && <td key={i}>{ getTagNameById(item?.subActionTag)?.subCategoryName }</td>) }
                                            </tr> */}
                  </tbody>
                </table>
              </div>
            )}
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
            <ErrorInfo message={"waiting for event..."} />
          </Fragment>
        )}

        {session?.userLevel !== 1 && contactDetails?.length !== 0 && (
          <ContactInfo contactDetails={contactDetails} />
        )}
        {session?.userLevel !== 1 && lawEnforcement?.length !== 0 && (
          <LawInfo lawEnforcement={lawEnforcement} />
        )}
        {session?.userLevel !== 1 && smsDetails?.length !== 0 && (
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
            />
          </div>
        )}
      </div>

      {live && (
        <Live currentEvent={currentEvent} closeLiveDialog={closeLiveDialog} />
      )}
    </Fragment>
  );
};

export default memo(Tile);

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
        if (res?.statusCode === 200) {
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
        if (res?.statusCode === 200) {
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
