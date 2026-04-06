import "./Escalation.css";
import { useState, useEffect, Fragment, memo } from "react";
import ErrorInfo from "../../utilities/error-info/ErrorInfo";
import { eventsGenericEmail, getAlertCategoriesForSiteId, getEmailDataForVMSEvents, playSiren } from "../../utilities/services/ApiService";
import { getHour, getStorage, getTimeByTimezone } from "../../utilities/services/StorageService";


const Escalation = ({ closeEscalation, currentEvent, index, handleFalse, handleSuspicious, monitoringData, actionsTaken, audio }) => {

  const [alerts, setAlerts] = useState([]);
  // const [actionTags, setActionTags] = useState([]);
  const [subAlerts, setSubAlerts] = useState([]);

  // const [selectedActionTag, setSelectedActionTag] = useState("");
  const [selectedAlertType, setSelectedAlertType] = useState("");
  const [selectedSubType, setSelectedSubType] = useState("");
  const [selection, setSelection] = useState("person");
  const [emaildata, setEmailData] = useState(null);
  const [notes, setNotes] = useState('');


  const fetchEmailData = async (val) => {
    setSelectedSubType(val)
    setEmailData('load');
    const response = await getEmailDataForVMSEvents({ ...currentEvent, ...{ alertTypeId: selectedAlertType }, ...{ subTypeId: val } });
    setEmailData(response);

  }

  const getSubAlerts = (val) => {
    clearFields()
    setSelectedAlertType(val)
    const x = alerts.filter((item) => item.guardAlertTypeId === parseInt(val)).flatMap((el) => el.subAlerts);
    setSubAlerts(x);
  };

  const session = getStorage('session');
  const handle = async (type) => {
    // if (session?.userLevel === 3 && (currentEvent?.userLevelAlarmInfo?.actionsTakenInfo?.length ?? 0 < 3)) return alert('Please take nessary actions!');

    const currentTime = getTimeByTimezone(currentEvent?.timezone);
    const hours = JSON.parse(audio?.audioHours ?? '[]');
    const currentHour = getHour(currentEvent?.timezone);
    // if (hours.includes(currentHour)) return;

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
          : (audio?.audioConfigured === 'T' && hours.includes(currentHour))
            ? (res?.statusCode === 200 ? 'P' : 'R')
            : 'F';
      currentEvent.activityDetTime = (audio?.audioConfigured === 'T' && !hours.includes(currentHour)) ? getTimeByTimezone(currentEvent?.timezone) : '';
    }

    const actions = [
      {
        name: 'Deterrent',
        selected: audio?.audioConfigured === 'T' ? true : false,
        status: audio?.audioConfigured === 'T' && !hours.includes(currentHour) && res.statusCode === 200 ? true : false,
        time: audio?.audioConfigured === 'T' && !hours.includes(currentHour) ? getTimeByTimezone(currentEvent?.timezone) : null
      }
    ];
    const output = [...actionsTaken, ...actions];

    if (type === 'escalate') {
      handleSuspicious(
        {
          ...currentEvent,
          index,
          actionTagTime: currentTime,
          alertTypeId: selectedAlertType,
          alertSubTypeId: selectedSubType,
          ...monitoringData,
          notes,
          actionsTaken: output
        }
      );
    } else {
      handleFalse(
        {
          ...currentEvent,
          alertTypeId: selectedAlertType,
          alertSubTypeId: selectedSubType,
          index,
          actionTagTime: currentTime,
          notes,
          actionsTaken: output
        }
      );
    }

    if (session?.userLevel === 2) {
      eventsGenericEmail(
        {
          ...currentEvent,
          actionTag: emaildata?.alertTag,
          alertTypeId: selectedAlertType,
          alertSubTypeId: selectedSubType,
          objectName: selection,
          ...emaildata,
          userSendMailLevel: type,
          address: monitoringData?.address
        }
      );
    }
    closeEscalation();
  }

  const clearFields = () => {
    setSelectedSubType("");
    setSelectedAlertType("");
    setEmailData(null);
  }

  useEffect(() => {
    const fetchMetadata = async () => {
      // const actionTagsResponse = await listActionTags(currentEvent);
      // if (actionTagsResponse && actionTagsResponse.data) {
      //   const [tags] = actionTagsResponse.data;
      //   setActionTags(tags.actionTags);
      // }

      const categoriesResponse = await getAlertCategoriesForSiteId(currentEvent);
      if (categoriesResponse) {
        setAlerts(categoriesResponse);
      }
    };
    fetchMetadata();
  }, [currentEvent]);

  const check = () => {
    if (session.userLevel === 2) {
      if (emaildata) return true
    } else {
      return true;
    }
  }

  return (
    <Fragment>

      <div className="close-btn" onClick={closeEscalation}>x</div>
      {/* Left Panel */}
      <div className="alert-input">
        <p className="section-title">SUSPICIOUS INPUT</p>

        {session?.userLevel === 2 &&
          <Fragment>
            {/* Person / Vehicle radio buttons */}
            <div className="radio-group">
              <label>
                <input type="radio" name="selection" checked={selection === "person"} onChange={() => { setSelection("person"); clearFields() }} />
                Person
              </label>
              <label>
                <input type="radio" name="selection" checked={selection === "vehicle"} onChange={() => { setSelection("vehicle"); clearFields() }} />
                Vehicle
              </label>
            </div>

            {/* Alert Type Dropdown */}
            {/* <div className="form-group">
          <label>Action Tag</label>
          <select
            value={selectedActionTag}
            onChange={(e) => setSelectedActionTag(e.target.value)}
          >
            <option value="" disabled>Select Action Tag</option>
            {actionTags?.map((item) => (
              <option key={item.value} value={item.id}>
                {item.value}
              </option>
            ))}
          </select>
        </div> */}

            {/* Alert Type Dropdown */}
            <div className="form-group">
              <label>Alert Type</label>
              <select
                value={selectedAlertType}
                onChange={(e) => getSubAlerts(e.target.value)}
              >
                <option value="" disabled>Select Alert Type</option>
                {alerts?.map((item, i) => (
                  <option key={i} value={item.guardAlertTypeId}>
                    {item.guardAlertType}
                  </option>
                ))}
              </select>
            </div>

            {/* Alert Sub Type Dropdown */}
            <div className="form-group">
              <label>Alert Sub Type</label>
              <select
                value={selectedSubType}
                onChange={(e) => fetchEmailData(e.target.value)}
              >
                <option value="" disabled>Select Alert Sub Type</option>
                {subAlerts?.map((item, i) => (
                  <option key={i} value={item.guardSubAlertTypeId}>
                    {item.guardSubAlertType}
                  </option>
                ))}
              </select>
            </div>
          </Fragment>
        }

        <div className="form-group">
          <label>Notes</label>
          <textarea rows={3} style={{ width: '100%' }} value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
        </div>

        {/* Action Buttons */}
        {check() &&
          <div className="button-group">
            <button className="btn-secondary" onClick={() => handle('complete')}>COMPLETE</button>
            {monitoringData && monitoringData.nextQueueName && <button className="btn-primary" onClick={() => handle('escalate')}>ESCALATE</button>}
          </div>
        }
      </div>


      {/* Right Panel */}
      {session?.userLevel === 2 &&
        <div className="alert-preview">
          {
            emaildata === 'load' ? <p>Loading...</p> : !emaildata ? <ErrorInfo message={'no data!'} /> :
              <Fragment>
                <div className="flex-group">
                  <p className="section-title">PREVIEW</p>
                </div>

                <div className="preview-card">
                  <div className="alert-header">
                    <span>
                      {emaildata?.emailSubject}
                    </span>
                  </div>
                </div>

                <table>
                  <tbody>
                    <tr>
                      <td><strong>To</strong></td>
                      <td>{emaildata?.recipientEmails?.join(', ')}</td>
                    </tr>
                    <tr>
                      <td><strong>CC</strong></td>
                      <td>{emaildata?.Cc?.join(', ')}</td>
                    </tr>
                    <tr>
                      <td><strong>BCC</strong></td>
                      <td>{emaildata?.BCC?.join(', ')}</td>
                    </tr>
                    <tr>
                      <td><strong>Body</strong></td>
                      <td>{emaildata?.emailBody}</td>
                    </tr>
                  </tbody>
                </table>



                {/* <p className="alert-message">
                  {emaildata?.emailBody}
                </p> */}

                {/* {
                emaildata?.screenshots?.map((item, i) =>
                  <img
                    src={item}
                    alt="Alert"
                    className="alert-image"
                  />
                )
              } */}

                <table>
                  <tbody>
                    {/* <tr>
                      <td><strong>Timezone</strong></td>
                      <td>{currentEvent?.timezone}</td>
                    </tr> */}
                    {/* <tr>
                      <td><strong>Monitoring</strong></td>
                      <td>{timeFormat(monitoringData)}</td>
                    </tr> */}
                    {/* <tr>
                      <td><strong>Action Tag</strong></td>
                      <td>{emaildata?.alertTag}</td>
                    </tr> */}

                    <tr>
                      <td><strong>Location</strong></td>
                      <td>{emaildata?.emailFields?.LOCATION}</td>
                    </tr>
                    <tr>
                      <td><strong>Date</strong></td>
                      <td>{emaildata?.emailFields?.DATE}</td>

                    </tr>
                    <tr>
                      <td><strong>Time</strong></td>
                      <td>{emaildata?.emailFields?.TIME}</td>

                    </tr>
                  </tbody>
                </table>

                <p className="alert-note">
                  {emaildata?.emailFooter}
                </p>
              </Fragment>
          }
        </div>}
    </Fragment>
  );
}

export default memo(Escalation);
