import "./Escalation.css";
import { useState, useEffect, Fragment } from "react";
import { getEmailDataForVMSEvents, getMetadata } from "../../services/ApiService";
import { useAuth } from "../../dashboard/Dashboard";

const Escalation = ({ closeEscalation, currentEvent }) => {
  // const data = useAuth();
  // console.log(data)

  const [alertTypeList, setAlertTypeList] = useState([]);
  const [subTypeList, setSubTypeList] = useState([]);
  const [selectedAlertType, setSelectedAlertType] = useState("");
  const [selectedSubType, setSelectedSubType] = useState("");

  // other UI states
  const [selection, setSelection] = useState("person");
//   const [selectedButton, setSelectedButton] = useState("mail");

//   const selectButton = (button) => setSelectedButton(button);

  const fetchMetadata = async () => {
    const meta = await getMetadata();
    meta.forEach((item) => {
      if (item.typeName === "GuardAlertType") {
        setAlertTypeList(item.metadata.filter((m) => m.active === "Y"));
      }
      if (item.typeName === "GuardSubTypeId") {
        setSubTypeList(item.metadata.filter((m) => m.active === "Y"));
      }
    });
  };

  const [emaildata, setEmailData] = useState('');
  const fetchEmailData = async () => {
    const detail = await getEmailDataForVMSEvents({ ...currentEvent, selectedAlertType, selectedSubType });
    console.log(detail);
    if(detail?.data?.statusCode === 200) {
      setEmailData(detail.data.emailDetails);
    }
  }

  useEffect(() => {
    fetchMetadata();
  }, []);

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
            onChange={(e) => { setSelectedAlertType(e.target.value) }}
          >
            <option value="" disabled>Select Alert Type</option>
            {alertTypeList?.map((item) => (
              <option key={item.id} value={item.keyId}>
                {item.value}
              </option>
            ))}
          </select>
        </div>

        {/* Alert Sub Type Dropdown */}
        <div className="form-group">
          <label>Alert Sub Type</label>
          <select
            value={selectedSubType}
            onChange={(e) => { setSelectedSubType(e.target.value); fetchEmailData() }}
          >
            <option value="" disabled>Select Alert Sub Type</option>
            {subTypeList?.map((item) => (
              <option key={item.id} value={item.keyId}>
                {item.value}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="button-group">
          <button className="btn-secondary" onClick={() => closeEscalation()}>COMPLETED</button>
          <button className="btn-primary" onClick={() => closeEscalation()}>ESCALATED</button>
        </div>
      </div>


      {/* Right Panel */}
      <div className="alert-preview">

        {
          emaildata &&
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
          </Fragment>
        }
      </div>
    </div>
  );
}

export default Escalation;
