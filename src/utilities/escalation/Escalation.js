import React, { useState } from "react";
import "./escalation.css";

export default function SuspiciousAlert() {
  const [alertType, setAlertType] = useState("ALERT");
  const [subType, setSubType] = useState("Potential Intruder Detected");
  const [selection, setSelection] = useState("Person");
    const [selectedButton, setSelectedButton] = useState("approvals");

  const selectButton = (button) => {
    setSelectedButton(button);
  };

    function getTypes() {
    this.metadaSer.getMetadata().subscribe((res) => {
      res.forEach((item) => {
        if (item.typeName === 'Action_Tag') {
          this.actionTags = item.metadata;
        }
        if (item.typeName === 'GuardAlertType') {
          this.alertTypes = item.metadata;
        }
        if (item.typeName === 'GuardSubTypeId') {
          this.alertSubTypes = item.metadata;
        }
        if (item.typeName === 'GuardDetailInfoFields') {
          this.alertFields = item.metadata;
        }
      });
    });
  }

  return (
    <div className="alert-container">
      {/* Left Panel */}
      <div className="alert-input">
        <h2 className="section-title">SUSPICIOUS INPUT</h2>

        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="selection"
              checked={selection === "Person"}
              onChange={() => setSelection("Person")}
            />
            Person
          </label>
          <label>
            <input
              type="radio"
              name="selection"
              checked={selection === "Vehicle"}
              onChange={() => setSelection("Vehicle")}
            />
            Vehicle
          </label>
        </div>

        <div className="form-group">
          <label>Alert Type</label>
          <select
            value={alertType}
            onChange={(e) => setAlertType(e.target.value)}
          >
            <option>ALERT</option>
            <option>WARNING</option>
          </select>
        </div>

        <div className="form-group">
          <label>Alert Sub Type</label>
          <select
            value={subType}
            onChange={(e) => setSubType(e.target.value)}
          >
            <option>Potential Intruder Detected</option>
            <option>Suspicious Movement</option>
            <option>Vehicle Loitering</option>
          </select>
        </div>

        <div className="button-group">
          <button className="btn-secondary">COMPLETED</button>
          <button className="btn-primary">ESCALATED</button>
        </div>
      </div>

      {/* Right Panel */}
      <div className="alert-preview">

        <div className="flex-group">
            <h2 className="section-title">PREVIEW</h2>

        <div className="button-group1">
      <button
        className={`toggle-button ${
          selectedButton === "approvals" ? "active" : ""
        }`}
        onClick={() => selectButton("approvals")}
      >
        Mail
      </button>

      <button
        className={`toggle-button ${
          selectedButton === "rejects" ? "activerej" : ""
        }`}
        style={{ position: "relative", left: "-30px" }}
        onClick={() => selectButton("rejects")}
      >
        Message
      </button>

        </div>
        
    </div>
     

        <div className="preview-card">
          <div className="preview-header">
            <div className="alert-header">
              <span>
                ALERT @ TID Systems - ({subType})
              </span>
            </div>
            <button className="mail-btn">
            </button>
          </div>

          <p className="alert-message">
            Irregular activity was detected at one of your businesses. Please review
            the information and attached screenshot(s) below and feel free to call us
            at <strong>(844) 438-4847</strong> if you have any additional questions or concerns.
          </p>

          <img
            src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&q=80&w=600"
            alt="Alert"
            className="alert-image"
          />

          <div className="alert-details">
            <p><strong>Location:</strong>CBRE - 3200 USA Parkway</p>
            <p><strong>Date:</strong>September 23rd, 2025</p>
            <p><strong>Time:</strong> 12:35:40 PM</p>
          </div>

          <p className="alert-note">
            We will also provide you with a video clip of the relevant activity shortly.
          </p>
        </div>
      </div>
    </div>
  );
}
