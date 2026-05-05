import "./Escalation.css";
import { useState, useEffect, Fragment, memo } from "react";
import ErrorInfo from "../../utilities/error-info/ErrorInfo";
import { eventsGenericEmail, getAlertCategoriesForSiteId, getEmailDataForVMSEvents } from "../../utilities/services/ApiService";
import { formatTimestamp, getStorage, getTimeByTimezone } from "../../utilities/services/StorageService";
import { toast } from "react-toastify";


const Escalation = ({ closeEscalation, currentEvent, index, handleFalse, handleSuspicious, monitoringData, actionsTaken, audio }) => {

  const customAction = getStorage("custom_action");

  const [alerts, setAlerts] = useState([]);
  // const [actionTags, setActionTags] = useState([]);
  const [subAlerts, setSubAlerts] = useState([]);
  // const [selectedActionTag, setSelectedActionTag] = useState("");
  const [selectedAlertType, setSelectedAlertType] = useState("");
  const [selectedSubType, setSelectedSubType] = useState("");
  const [selection, setSelection] = useState("person");
  const [emaildata, setEmailData] = useState(null);
  const [completeEmailPreview, setCompleteEmailPreview] = useState(null);
  const [notes, setNotes] = useState('');

  const session = getStorage('session');

  const fetchEmailData = async (val) => {
    setSelectedSubType(val)
    setEmailData('load');
    const callingSystemDetail = session?.userLevel === 3 ? 'dashboard' : 'events-console';
    const response = await getEmailDataForVMSEvents({ ...currentEvent, ...{ alertTypeId: selectedAlertType }, ...{ subTypeId: val }, callingSystemDetail });
    setEmailData(response);
  }

  const getSubAlerts = (val) => {
    clearFields();
    setSelectedAlertType(val);
    const x = alerts.filter((item) => item.guardAlertTypeId === parseInt(val)).flatMap((el) => el.subAlerts);
    setSubAlerts(x);
  };

  const handle = async (type) => {
    if (customAction === 2 && session?.userLevel === 3 && type !== 'complete') {
      if (actionsTaken.length === 0) return toast.warn('No actions found!');

      const allChecked = actionsTaken.some((item) => item?.selected);
      if (!allChecked)
        return toast.warn(
          'Actions are mandatory please update atleast one of them!'
        );
    }

    const currentTime = getTimeByTimezone(currentEvent?.timezone);

    if (type === 'complete' && session?.userLevel === 3) {
      if (!emaildata || emaildata === 'load') {
        return toast.warn('Please select alert subtype and wait for email data!');
      }

      setCompleteEmailPreview({
        email: emaildata,
        event: currentEvent,
        actionTime: currentTime,
        notes,
        actionsTaken,
      });
      return;
    }

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
          actionsTaken
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
          actionsTaken
        }
      );

    }

    if (session?.userLevel === 2) {
      const output = currentEvent?.userLevelAlarmInfo?.flatMap(
        (item) => item?.actionsTakenInfo?.filter(Boolean) ?? []
      ) ?? [];
      eventsGenericEmail(
        {
          ...currentEvent,
          actionTag: emaildata?.alertTag,
          alertTypeId: selectedAlertType,
          alertSubTypeId: selectedSubType,
          objectName: selection,
          ...emaildata,
          userSendMailLevel: type,
          address: monitoringData?.address,
          actionTaken: output,
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

  const submitCompletePreview = ({ notes: previewNotes, actionsTaken: previewActions }) => {
    handleFalse(
      {
        ...currentEvent,
        alertTypeId: selectedAlertType,
        alertSubTypeId: selectedSubType,
        index,
        actionTagTime: completeEmailPreview?.actionTime,
        notes: previewNotes,
        actionsTaken: previewActions
      }
    );
    closeEscalation();
  };

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

        {(session?.userLevel === 2 || session?.userLevel === 3) &&
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

      {completeEmailPreview && (
        <CompleteEmailDialog
          preview={completeEmailPreview}
          onCancel={() => setCompleteEmailPreview(null)}
          onSubmit={submitCompletePreview}
        />
      )}
    </Fragment>
  );
}

export default memo(Escalation);

const toList = (value) => Array.isArray(value) ? value.filter(Boolean).join(', ') : value || '-';

const getPreviewDateTime = (email, event, actionTime) => {
  const fields = email?.emailFields ?? {};
  const fieldDateTime = [fields?.DATE, fields?.TIME].filter(Boolean).join(' - ');
  if (fieldDateTime) return fieldDateTime;
  if (event?.eventTime) return formatTimestamp(event.eventTime);
  return actionTime || '-';
};

const getSelectedActions = (actions) => (actions ?? [])
  .filter((item) => item?.selected)
  .map((item) => ({ ...item }));

const formatPreviewActions = (actions) => {
  if (!actions?.length) return '-';
  return actions.map((item) => item?.name).filter(Boolean).join(', ');
};

const CompleteEmailDialog = ({ preview, onCancel, onSubmit }) => {
  const { email, event, actionTime, notes, actionsTaken } = preview;
  const [editableActions, setEditableActions] = useState(() => getSelectedActions(actionsTaken));
  const [actionInput, setActionInput] = useState('');
  const [draftNotes, setDraftNotes] = useState(notes || '');
  const [files, setFiles] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const fields = email?.emailFields ?? {};
  const description = email?.emailBody || fields?.DESCRIPTION || '-';
  const camera = fields?.CAMERA || event?.cameraId || '-';
  const dateTime = getPreviewDateTime(email, event, actionTime);

  const addAction = () => {
    const name = actionInput.trim();
    if (!name) return;
    if (editableActions.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setActionInput('');
      return;
    }
    setEditableActions((prev) => [
      ...prev,
      {
        name,
        selected: true,
        status: false,
        time: actionTime,
        editing: false,
      }
    ]);
    setActionInput('');
  };

  const removeAction = (index) => {
    setEditableActions((prev) => prev.filter((_, i) => i !== index));
  };

  const getFinalActions = () => {
    const pendingActionName = actionInput.trim();
    const pendingActionExists = pendingActionName && editableActions.some((item) => item.name.toLowerCase() === pendingActionName.toLowerCase());
    return pendingActionName && !pendingActionExists
      ? [
        ...editableActions,
        {
          name: pendingActionName,
          selected: true,
          status: false,
          time: actionTime,
          editing: false,
        }
      ]
      : editableActions;
  };

  const submit = () => {
    const finalActions = getFinalActions();

    if (!finalActions.length) {
      toast.warn('Actions are mandatory please update atleast one of them!');
      return;
    }

    onSubmit({
      notes: draftNotes,
      actionsTaken: finalActions.map(({ editing, ...item }) => ({
        ...item,
        selected: true,
      })),
    });
  };

  if (showPreview) {
    return (
      <PreviewEmailDialog
        email={email}
        event={event}
        description={description}
        camera={camera}
        dateTime={dateTime}
        actionsTaken={getFinalActions()}
        notes={draftNotes}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="complete-email-backdrop">
      <div className="complete-email-dialog">
        <button className="complete-email-close" onClick={onCancel}>x</button>

        <div className="complete-email-content">
          <div className="complete-email-logo">
            <img src="images/ivis.png" alt="logo" />
          </div>

          <p className="complete-email-site">{event?.siteName || fields?.LOCATION || '-'}</p>

          <div className="complete-email-alert">
            {email?.emailSubject || `ALERT @ ${event?.siteName || '-'} - [ Unauthorized Entry Detected ]`}
          </div>

          <table className="complete-email-table">
            <tbody>
              <tr>
                <td>To</td>
                <td>{toList(email?.recipientEmails)}</td>
              </tr>
              <tr>
                <td>Cc</td>
                <td>{toList(email?.Cc)}</td>
              </tr>
              <tr>
                <td>Bcc</td>
                <td>{toList(email?.BCC)}</td>
              </tr>
              <tr>
                <td>Date & Time</td>
                <td>{dateTime}</td>
              </tr>
              <tr>
                <td>Description</td>
                <td>{description}</td>
              </tr>
              <tr>
                <td>Camera</td>
                <td>{camera}</td>
              </tr>
            </tbody>
          </table>

          <p className="complete-email-info">Please review the Information above.</p>
          <p className="complete-email-contact">Call <strong>(844) 438-4847 (ext. 1)</strong> or email support@ivisecurity.com</p>
        </div>

        <div className="resolution-divider"></div>

        <div className="resolution-details">
          <p className="resolution-title">Resolution Details</p>

          <label className="resolution-label">Actions Taken</label>
          <div className="action-editor">
            {editableActions.map((item, i) => (
              <span className="action-chip" key={`${item.name}-${i}`}>
                {item.name}
                <button type="button" onClick={() => removeAction(i)}>x</button>
              </span>
            ))}
            <input
              value={actionInput}
              placeholder="Describe action taken"
              onBlur={addAction}
              onChange={(e) => setActionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAction();
                }
              }}
            />
          </div>

          <label className="resolution-label">Notes</label>
          <input
            className="resolution-notes"
            value={draftNotes}
            placeholder="Additional notes"
            onChange={(e) => setDraftNotes(e.target.value)}
          />

          <label className="upload-box">
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            <span>{files.length ? files.map((file) => file.name).join(', ') : 'Click to upload Images/videos'}</span>
          </label>

          <div className="resolution-actions">
            <button type="button" className="preview-btn" onClick={() => setShowPreview(true)}>Preview</button>
            <button type="button" className="submit-close-btn" onClick={submit}>Submit and close event</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PreviewEmailDialog = ({ email, event, description, camera, dateTime, actionsTaken, notes, onClose }) => {
  return (
    <div className="preview-email-backdrop">
      <div className="preview-email-dialog">
        <button className="preview-email-close" onClick={onClose}>x</button>

        <div className="preview-email-logo">
          <img src="images/ivis.png" alt="logo" />
        </div>

        <p className="preview-email-site">{event?.siteName || email?.emailFields?.LOCATION || '-'}</p>

        <div className="preview-email-alert">
          {email?.emailSubject || `ALERT @ ${event?.siteName || '-'} - [ Unauthorized Entry Detected ]`}
        </div>

        <table className="preview-email-table">
          <tbody>
            <tr>
              <td>To</td>
              <td>{toList(email?.recipientEmails)}</td>
            </tr>
            <tr>
              <td>Cc</td>
              <td>{toList(email?.Cc)}</td>
            </tr>
            <tr>
              <td>Bcc</td>
              <td>{toList(email?.BCC)}</td>
            </tr>
            <tr>
              <td>Date & Time</td>
              <td>{dateTime}</td>
            </tr>
            <tr>
              <td>Description</td>
              <td>{description}</td>
            </tr>
            <tr>
              <td>Camera</td>
              <td>{camera}</td>
            </tr>
            <tr>
              <td>Actions Taken</td>
              <td>{formatPreviewActions(actionsTaken)}</td>
            </tr>
            <tr>
              <td>Notes</td>
              <td>{notes || '-'}</td>
            </tr>
          </tbody>
        </table>

        <p className="preview-email-info">Please review the information above.</p>
        <p className="preview-email-contact">Call <strong>(844) 438-4847 (ext. 1)</strong> or email support@ivisecurity.com</p>
        <div className="preview-email-divider"></div>
      </div>
    </div>
  );
};
