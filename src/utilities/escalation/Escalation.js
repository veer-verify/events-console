import "./escalation.css";
import { useState, useEffect } from "react";
import { getMetadata } from "../../services/ApiService";
import { useAuth } from "../../dashboard/Dashboard";

const Escalation = ({closeEscalation,currentEvent}) => {
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

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const meta = await getMetadata();

        meta.forEach((item) => {
          if (item.typeName === "GuardAlertType") {
            setAlertTypeList(item.metadata.filter((m) => m.active === "Y"));
          }
          if (item.typeName === "GuardSubTypeId") {
            setSubTypeList(item.metadata.filter((m) => m.active === "Y"));
          }
        });
      } catch (err) {
        console.error("Error fetching metadata:", err);
      }
    };

    console.log(currentEvent)

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
            onChange={(e) => setSelectedAlertType(e.target.value)}
          >
            <option value="">Select Alert Type</option>
            {alertTypeList?.map((type) => (
              <option key={type.id} value={type.value}>
                {type.value}
              </option>
            ))}
          </select>
        </div>

        {/* Alert Sub Type Dropdown */}
        <div className="form-group">
          <label>Alert Sub Type</label>
          <select
            value={selectedSubType}
            onChange={(e) => setSelectedSubType(e.target.value)}
          >
            <option value="">Select Alert Sub Type</option>
            {subTypeList?.map((sub) => (
              <option key={sub.id} value={sub.value}>
                {sub.value}
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
              ALERT @ TID Systems - {selectedSubType || "No Subtype Selected"}
            </span>
          </div>
        </div>

        <p className="alert-message">
          Irregular activity was detected at one of your businesses. Please
          review the information and attached screenshot(s) below and feel free
          to call us at <strong>(844) 438-4847</strong> if you have any
          additional questions or concerns.
        </p>

        <img
          src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&q=80&w=600"
          alt="Alert"
          className="alert-image"
        />

        <div className="alert-details">
          <p>
            <strong>Location:</strong> CBRE - 3200 USA Parkway
          </p>
          <p>
            <strong>Date:</strong> September 23rd, 2025
          </p>
          <p>
            <strong>Time:</strong> 12:35:40 PM
          </p>
        </div>

        <p className="alert-note">
          We will also provide you with a video clip of the relevant activity
          shortly.
        </p>
      </div>
    </div>
  );
}

export default Escalation;
