import "./Escalation.css";
import { useState, useEffect, Fragment } from "react";
import { eventsGenericEmail, getAlertCategoriesForSiteId, getEmailDataForVMSEvents, listActionTags, updateEventFullDetails, write2VmsDispatchQueue } from "../../services/ApiService";
import { useAuth } from "../Dashboard";
import { getStorage, getTimeByTimezone, getSession, setStorage } from "../../services/StorageService";
import ErrorInfo from "../../utilities/error-info/ErrorInfo";

const Escalation = ({ closeEscalation, currentEvent, handleEvent }) => {
  // const data = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [actionTags, setActionTags] = useState([]);
  const [subAlerts, setSubAlerts] = useState([]);

  const [selectedActionTag, setSelectedActionTag] = useState("");
  const [selectedAlertType, setSelectedAlertType] = useState("");
  const [selectedSubType, setSelectedSubType] = useState("");
  const [selection, setSelection] = useState("person");
  const [emaildata, setEmailData] = useState(null);
  //  const [selectedButton, setSelectedButton] = useState("mail");
  //  const selectButton = (button) => setSelectedButton(button);


  const fetchEmailData = async (val) => {
    setSelectedSubType(val)
    const response = await getEmailDataForVMSEvents({ ...currentEvent, ...{ alertTypeId: selectedAlertType }, ...{ subTypeId: val } });
    setEmailData(response);
  }

  const escalate = () => {
    if (!selectedSubType) return alert('please select all fields!');
    currentEvent?.userLevelAlarmInfo?.push(
      {
        level: getSession().userLevel,
        user: getSession().UserId,
        alarm: 'N',
        landingTime: currentEvent?.landingTime ?? '',
        reviewStart: currentEvent?.landingTime ?? '',
        reviewEnd: getTimeByTimezone(currentEvent?.timezone),
        actionTag: parseInt(selectedActionTag),
        subActionTag: getStorage('sub_action').subCategoryId,
        notes: ''
      })
    write2VmsDispatchQueue(
      { ...currentEvent, ...{ actionTag: parseInt(selectedActionTag) }, ...{ subActionTag: getStorage('sub_action').subCategoryId } }
    );
    eventsGenericEmail(
      { ...currentEvent, ...{ actionTag: parseInt(selectedActionTag) }, ...{ alertTypeId: selectedAlertType }, ...{ alertSubTypeId: selectedSubType }, ...{ objectName: selection }, ...emaildata }
    );
    setStorage('custom_action', 3);
    handleEvent();
    closeEscalation();
  }

  const complete = () => {
    if (!selectedSubType) return alert('please select all fields!');
    currentEvent?.userLevelAlarmInfo?.push(
      {
        level: getSession().userLevel,
        user: getSession().UserId,
        alarm: 'N',
        landingTime: currentEvent?.landingTime ?? '',
        reviewStart: currentEvent?.landingTime ?? '',
        reviewEnd: getTimeByTimezone(currentEvent?.timezone),
        actionTag: parseInt(selectedActionTag),
        subActionTag: getStorage('sub_action').subCategoryId,
        notes: ''
      })
    updateEventFullDetails(
      { ...currentEvent, ...{ actionTag: parseInt(selectedActionTag) }, ...{ subActionTag: getStorage('sub_action').subCategoryId }, selectedAlertType, selectedSubType }
    );
    setStorage('custom_action', 3);
    handleEvent();
    closeEscalation();
  }

  const getSubAlerts = (val) => {
    setSelectedSubType("");
    setSelectedAlertType(val)
    const x = alerts.filter((item) => item.guardAlertTypeId === parseInt(val)).flatMap((el) => el.subAlerts);
    setSubAlerts(x);
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      const actionTagsResponse = await listActionTags(currentEvent);
      if (actionTagsResponse && actionTagsResponse.data) {
        const [tags] = actionTagsResponse.data;
        setActionTags(tags.actionTags);
      }

      const categoriesResponse = await getAlertCategoriesForSiteId(currentEvent);
      if (categoriesResponse) {
        setAlerts(categoriesResponse);
      }
    };
    fetchMetadata();
  }, [currentEvent]);

  return (
    <Fragment>

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
        <div className="form-group">
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
        </div>

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

        {/* Action Buttons */}
        {emaildata &&
          <div className="button-group">
            <button className="btn-secondary" onClick={() => complete()}>COMPLETE</button>
            <button className="btn-primary" onClick={() => escalate()}>ESCALATE</button>
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

              {
                emaildata?.screenshots?.map((item, i) =>
                  <img
                    src={item}
                    alt="Alert"
                    className="alert-image"
                  />
                )
              }

              <table>
                <tbody>
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
