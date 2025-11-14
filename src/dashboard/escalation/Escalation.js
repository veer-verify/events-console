import "./Escalation.css";
import { useState, useEffect, Fragment } from "react";
import { useAuth } from "../Dashboard";
import ErrorInfo from "../../utilities/error-info/ErrorInfo";
import { eventsGenericEmail, getAlertCategoriesForSiteId, getEmailDataForVMSEvents } from "../../utilities/ApiService";
import { getStorage, getTimeByTimezone, timeFormat } from "../../utilities/StorageService";

const Escalation = ({ closeEscalation, currentEvent, handleFalse, handleSuspicious, monitoringData }) => {
  // const data = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [actionTags, setActionTags] = useState([]);
  const [subAlerts, setSubAlerts] = useState([]);

  // const [selectedActionTag, setSelectedActionTag] = useState("");
  const [selectedAlertType, setSelectedAlertType] = useState("");
  const [selectedSubType, setSelectedSubType] = useState("");
  const [selection, setSelection] = useState("person");
  const [emaildata, setEmailData] = useState(null);
  const [notes, setNotes] = useState('');
  //  const [selectedButton, setSelectedButton] = useState("mail");
  //  const selectButton = (button) => setSelectedButton(button);


  const fetchEmailData = async (val) => {
    setSelectedSubType(val)
    const response = await getEmailDataForVMSEvents({ ...currentEvent, ...{ alertTypeId: selectedAlertType }, ...{ subTypeId: val } });
    setEmailData(response);
  }

  const getSubAlerts = (val) => {
    setSelectedSubType("");
    setSelectedAlertType(val)
    const x = alerts.filter((item) => item.guardAlertTypeId === parseInt(val)).flatMap((el) => el.subAlerts);
    setSubAlerts(x);
  };

  const handle = (type) => {
    const session = getStorage('session');
    const currentTime = getTimeByTimezone(currentEvent?.timezone);
    if (type === 'escalate') {
      handleSuspicious({ ...currentEvent, actionTagTime: currentTime, ...monitoringData, notes });
      if (session?.userLevel === 2) {
        eventsGenericEmail(
          { ...currentEvent, ...{ actionTag: emaildata?.alertTagId }, ...{ alertTypeId: selectedAlertType }, ...{ alertSubTypeId: selectedSubType }, ...{ objectName: selection }, ...emaildata }
        );
      }
    } else {
      handleFalse({ ...currentEvent, actionTagTime: currentTime, notes });
    }
    closeEscalation();
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

  return (
    <Fragment>

      <div className="close-btn" onClick={closeEscalation}>x</div>
      {/* Left Panel */}
      <div className="alert-input">
        <p className="section-title">SUSPICIOUS INPUT</p>

        {/* Person / Vehicle radio buttons */}
        <div className="radio-group">
          <label>
            <input type="radio" name="selection" checked={selection === "person"} onChange={() => setSelection("person")} />
            Person
          </label>
          <label>
            <input type="radio" name="selection" checked={selection === "vehicle"} onChange={() => setSelection("vehicle")} />
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
            {alerts?.map((item) => (
              <option key={item.guardAlertTypeId} value={item.guardAlertTypeId}>
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
            {subAlerts?.map((item) => (
              <option key={item.guardSubAlertTypeId} value={item.guardSubAlertTypeId}>
                {item.guardSubAlertType}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea rows={3} style={{ width: '100%' }} value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
        </div>

        {/* Action Buttons */}
        {emaildata &&
          <div className="button-group">
            <button className="btn-secondary" onClick={() => handle('complete')}>COMPLETE</button>
            {monitoringData && monitoringData.nextQueueName !== '' && <button className="btn-primary" onClick={() => handle('escalate')}>ESCALATE</button>}
          </div>
        }
      </div>


      {/* Right Panel */}
      <div className="alert-preview">
        {
          emaildata
            ?
            <Fragment>
              <div className="flex-group">
                <p className="section-title">PREVIEW</p>

                {/* <div className="button-group1">
              <button
                className={`toggle-button ${selectedButton === "mail" ? "active" : ""
                  }`}
                onClick={() => selectButton("mail")}>
                Mail
              </button>
              <button
                className={`toggle-button ${selectedButton === "message" ? "activerej" : ""
                  }`}
                style={{ position: "relative", left: "-30px" }}
                onClick={() => selectButton("message")}>
                Message
              </button>
            </div> */}
              </div>

              <div className="preview-card">
                <div className="alert-header">
                  <span>
                    {emaildata?.emailSubject}
                  </span>
                </div>
              </div>

              <p className="alert-message">
                {emaildata?.emailBody}
              </p>

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
                  <tr>
                    <td><strong>Timezone</strong></td>
                    <td>{currentEvent?.timezone}</td>
                  </tr>
                  <tr>
                    <td><strong>Monitoring</strong></td>
                    <td>{timeFormat(monitoringData)}</td>
                  </tr>
                  <tr>
                    <td><strong>Action Tag</strong></td>
                    <td>{emaildata?.alertTag}</td>
                  </tr>
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
            :
            !emaildata
              ?
              <p></p>
              :
              <ErrorInfo message={'no data!'} />
        }
      </div>
    </Fragment>
  );
}

export default Escalation;
