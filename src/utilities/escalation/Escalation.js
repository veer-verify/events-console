import "./Escalation.css";
import { useState, useEffect, Fragment } from "react";
import { getAlertCategoriesForSiteId, getEmailDataForVMSEvents, updateEventFullDetails, write2VmsDispatchQueue } from "../../services/ApiService";
import { useAuth } from "../../dashboard/Dashboard";
import { getStorage, setStorage } from "../../services/StorageService";

const Escalation = ({ closeEscalation, currentEvent, handleEvent }) => {
  // const data = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [subAlerts, setSubAlerts] = useState([]);
  const [selectedAlertType, setSelectedAlertType] = useState("");
  const [selectedSubType, setSelectedSubType] = useState("");

  const [selection, setSelection] = useState("person");
  //  const [selectedButton, setSelectedButton] = useState("mail");
  //  const selectButton = (button) => setSelectedButton(button);



  const [emaildata, setEmailData] = useState('');

  const fetchEmailData = async (val) => {
    setSelectedSubType(val)
    const response = await getEmailDataForVMSEvents({ ...currentEvent, selectedAlertType, ...{ selectedSubType: val } });
    setEmailData(response);
  }

  const escalate = () => {
    // const type = getStorage('id');
    // if(type === 1) {
    //   write2VmsDispatchQueue(currentEvent);
    // } else {
    //   updateEventFullDetails({...currentEvent, selectedAlertType, selectedSubType});
    // }
    updateEventFullDetails({ ...currentEvent, selectedAlertType, selectedSubType });
    setStorage('id', 1);
    handleEvent(currentEvent);
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
      const response = await getAlertCategoriesForSiteId(currentEvent);
      setAlerts(response);
    };
    fetchMetadata();
  }, [currentEvent]);

  return (
    <div className="alert-container">

      {/* Left Panel */}
      <div className="alert-input">
        <p className="section-title">SUSPICIOUS INPUT</p>

        {/* Person / Vehicle radio buttons */}
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="selection"
              checked={selection === "person"}
              onChange={() => setSelection("person")}
            />
            Person
          </label>
          <label>
            <input
              type="radio"
              name="selection"
              checked={selection === "vehicle"}
              onChange={() => setSelection("vehicle")}
            />
            Vehicle
          </label>
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
            <button className="btn-secondary" onClick={escalate}>COMPLETE</button>
            <button className="btn-primary" onClick={escalate}>ESCALATE</button>
          </div>
        }
      </div>


      {/* Right Panel */}
      <div className="alert-preview">
        {
          emaildata ?
            <Fragment>
              <div className="flex-group">
                <p className="section-title">PREVIEW</p>

                {/* <div className="button-group1">
              <button
                className={`toggle-button ${selectedButton === "mail" ? "active" : ""
                  }`}
                onClick={() => selectButton("mail")}
              >
                Mail
              </button>

              <button
                className={`toggle-button ${selectedButton === "message" ? "activerej" : ""
                  }`}
                style={{ position: "relative", left: "-30px" }}
                onClick={() => selectButton("message")}
              >
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

              <div className="alert-details">
                <p>
                  <strong>Location:</strong> {emaildata?.emailFields?.LOCATION}
                </p>
                <p>
                  <strong>Date:</strong> {emaildata?.emailFields?.DATE}
                </p>
                <p>
                  <strong>Time:</strong> {emaildata?.emailFields?.TIME}
                </p>
              </div>

              <p className="alert-note">
                {emaildata?.emailFooter}
              </p>
            </Fragment> :
            <p>Loading...</p>
        }
      </div>
    </div>
  );
}

export default Escalation;
