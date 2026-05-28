import "./Escalation.css";
import { useState, useEffect, Fragment, memo } from "react";
import ErrorInfo from "../../utilities/error-info/ErrorInfo";
import { eventsGenericEmail, getAlertCategoriesForSiteId, getEmailDataForVMSEvents, sendResolutionEmail } from "../../utilities/services/ApiService";
import { formatTimestamp, getStorage, getTimeByTimezone } from "../../utilities/services/StorageService";
import { toast } from "react-toastify";


const Escalation = ({ closeEscalation, currentEvent, index, updateEvent, writeToVms, monitoringData, actionsTaken, audio }) => {

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
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [draftEmail, setDraftEmail] = useState(null);

  const session = getStorage('session');
  const selectionRadioName = `selection-${currentEvent?.eventId ?? index}`;

  const startEditPreview = () => {
    setDraftEmail(emailToDraft(emaildata));
    setIsEditingPreview(true);
  };

  const cancelEditPreview = () => {
    setIsEditingPreview(false);
    setDraftEmail(null);
  };

  const saveEditPreview = () => {
    setEmailData(draftToEmail(draftEmail));
    setIsEditingPreview(false);
    setDraftEmail(null);
  };

  const updateDraftField = (key, value) => {
    setDraftEmail((prev) => ({ ...prev, [key]: value }));
  };

  const validateLevelTwoInput = () => {
    if (selectedAlertType === '') {
      toast.warn('Select an alert type to continue.');
      return false;
    }

    if (selectedSubType === '') {
      toast.warn('Select an alert subtype to continue.');
      return false;
    }

    if (!emaildata || emaildata === 'load') {
      toast.warn('Please wait while the email preview is prepared.');
      return false;
    }

    return true;
  };

  const validateLevelThreeActions = () => {
    if (actionsTaken.length === 0) {
      toast.warn('No actions are available for this event.');
      return false;
    }

    if (!hasSelectedAction(actionsTaken)) {
      toast.warn('Choose at least one action, or select No Action Necessary.');
      return false;
    }

    return true;
  };

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
    if (session?.userLevel === 2 && !validateLevelTwoInput()) {
      return;
    }

    if (customAction === 2 && session?.userLevel === 3 && !validateLevelThreeActions()) {
      return;
    }

    const currentTime = getTimeByTimezone(currentEvent?.timezone);

    if (type === 'complete' && session?.userLevel === 3) {
      const levelTwoAlarmInfo = getAlarmInfoByLevel(currentEvent?.userLevelAlarmInfo, 2);
      const alertTypeId = levelTwoAlarmInfo?.alertTag ?? selectedAlertType;
      const subTypeId = levelTwoAlarmInfo?.subAlertTag ?? selectedSubType;
      let emailDetails = emaildata;

      setEmailData('load');
      const callingSystemDetail = 'dashboard';
      const freshEmailDetails = await getEmailDataForVMSEvents({ ...currentEvent, alertTypeId, subTypeId, callingSystemDetail });
      emailDetails = freshEmailDetails || emailDetails;
      setEmailData(emailDetails);

      if (!emailDetails) {
        return toast.warn('Email details could not be prepared. Please try again.');
      }

      const selectedTileActions = formatActionsForPreview(getSelectedActions(actionsTaken), currentTime);
      const apiActionsTakenInfo = emailDetails?.actionsTakenInfo
        ?? emailDetails?.ActionsTakenInfo
        ?? emailDetails?.ACTIONS_TAKEN_INFO
        ?? emailDetails?.emailFields?.actionsTakenInfo
        ?? emailDetails?.emailFields?.ActionsTakenInfo
        ?? emailDetails?.emailFields?.ACTIONS_TAKEN_INFO
        ?? currentEvent?.userLevelAlarmInfo?.map((item) => item?.actionsTakenInfo)
        ?? [];
      const emailActions = formatEmailActionsTakenInfo(apiActionsTakenInfo, currentTime);

      setCompleteEmailPreview({
        email: emailDetails,
        event: currentEvent,
        actionTime: currentTime,
        notes,
        selectedActionsTaken: selectedTileActions,
        emailActionsTaken: emailActions,
        emailActionsTakenInfo: apiActionsTakenInfo,
        actionsTaken: combinePreviewActions(
          selectedTileActions,
          emailActions
        ),
      });
      return;
    }

    if (type === 'escalate') {
      const audioStatus = getSubmittedAudioStatus(currentEvent, audio);
      writeToVms(
        {
          ...currentEvent,
          audioStatus,
          activityDetTime: audioStatus === 'P' || audioStatus === 'F' ? currentEvent?.activityDetTime ?? '' : '',
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
      const audioStatus = getSubmittedAudioStatus(currentEvent, audio);
      updateEvent(
        {
          ...currentEvent,
          audioStatus,
          activityDetTime: audioStatus === 'P' || audioStatus === 'F' ? currentEvent?.activityDetTime ?? '' : '',
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

  const submitCompletePreview = async ({ notes: previewNotes, actionsTaken: previewActions, files }) => {
    const levelTwoAlarmInfo = getAlarmInfoByLevel(currentEvent?.userLevelAlarmInfo, 2);
    const alertTypeId = levelTwoAlarmInfo?.alertTag ?? selectedAlertType;
    const subTypeId = levelTwoAlarmInfo?.subAlertTag ?? selectedSubType;

    if (session?.userLevel === 3) {
      const email = completeEmailPreview?.email;
      const response = await sendResolutionEmail({
        senderEmail: email?.senderEmail,
        recipientEmails: email?.recipientEmails,
        bcc: email?.BCC,
        cc: email?.Cc,
        subject: email?.emailSubject,
        body: email?.emailBody,
        files,
        fields: email?.emailFields,
        siteId: currentEvent?.siteId,
        cameraId: currentEvent?.cameraId,
        actionsTaken: formatPreviewActions(previewActions),
        notes: previewNotes,
        eventId: currentEvent?.eventId,
        createdBy: session?.UserId,
        alerTagId: alertTypeId,
        subAlertTagId: subTypeId,
        timeZone: currentEvent?.timezone,
      });

      if (!response) {
        toast.error('Resolution email could not be sent. Please try again.');
        return false;
      }
    }

    updateEvent(
      {
        ...currentEvent,
        alertTypeId,
        alertSubTypeId: subTypeId,
        index,
        actionTagTime: completeEmailPreview?.actionTime,
        notes: previewNotes,
        actionsTaken: previewActions
      }
    );
    closeEscalation();
    return true;
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

  // const check = () => {
  //   if (session.userLevel === 2) {
  //     if (emaildata) return true
  //   } else {
  //     return true;
  //   }
  // }

  return (
    <Fragment>

      {/* Left Panel */}
      <div className="alert-input">
        <p className="section-title">SUSPICIOUS INPUT</p>

        {(session?.userLevel === 2) &&
          <Fragment>
            {/* Person / Vehicle radio buttons */}
            <div className="radio-group">
              <label>
                <input type="radio" name={selectionRadioName} checked={selection === "person"} onChange={() => { setSelection("person"); clearFields() }} />
                Person
              </label>
              <label>
                <input type="radio" name={selectionRadioName} checked={selection === "vehicle"} onChange={() => { setSelection("vehicle"); clearFields() }} />
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
        <div className="button-group">
          <button className="btn-secondary" onClick={() => handle('complete')}>COMPLETE</button>
          {monitoringData && monitoringData.nextQueueName && <button className="btn-primary" onClick={() => handle('escalate')}>ESCALATE</button>}
        </div>
      </div>


      {/* Right Panel */}
      {session?.userLevel === 2 &&
        <div className="alert-preview">
          <div className="flex-group">
            <p className="section-title">PREVIEW</p>
            <div className="preview-toolbar-actions">
              {emaildata !== 'load' && emaildata && (!isEditingPreview ? (
                <button type="button" className="edit-preview-btn" title="Edit" onClick={startEditPreview}>
                  <svg className="edit-pencil-icon" viewBox="0 0 24 24" fill="none" stroke="#ed3237" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
              ) : (
                <div className="edit-preview-actions">
                  <button type="button" className="edit-save-btn" onClick={saveEditPreview}>Save</button>
                  <button type="button" className="edit-cancel-btn" onClick={cancelEditPreview}>Cancel</button>
                </div>
              ))}
              <div className="close-btn" onClick={closeEscalation}>x</div>
            </div>
          </div>
          {
            emaildata === 'load' ? <p>Loading...</p> : !emaildata ? <ErrorInfo message={'no data!'} /> :
              <Fragment>
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
                      <td>{isEditingPreview ? (
                        <textarea
                          className="edit-input edit-textarea"
                          rows={4}
                          value={draftEmail?.emailBody ?? ''}
                          onChange={(e) => updateDraftField('emailBody', e.target.value)}
                        />
                      ) : emaildata?.emailBody}</td>
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

                {isEditingPreview ? (
                  <textarea
                    className="edit-input edit-textarea alert-note"
                    rows={2}
                    value={draftEmail?.emailFooter ?? ''}
                    onChange={(e) => updateDraftField('emailFooter', e.target.value)}
                  />
                ) : (
                  <p className="alert-note">
                    {emaildata?.emailFooter}
                  </p>
                )}
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

const splitEmails = (value) => (value ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const emailToDraft = (data) => ({
  ...data,
  recipientEmails: (data?.recipientEmails ?? []).join(', '),
  Cc: (data?.Cc ?? []).join(', '),
  BCC: (data?.BCC ?? []).join(', '),
  emailFields: { ...(data?.emailFields ?? {}) },
});

const draftToEmail = (draft) => ({
  ...draft,
  recipientEmails: splitEmails(draft?.recipientEmails),
  Cc: splitEmails(draft?.Cc),
  BCC: splitEmails(draft?.BCC),
});

const hasEmails = (value) => Array.isArray(value)
  ? value.some((item) => item && item.trim())
  : Boolean(value?.trim?.());

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

const getPreviewActions = (actions, actionTime) => {
  return getActionsTakenInfoList(actions)
    .map((item) => {
      if (typeof item === 'string') {
        return {
          name: item,
          selected: true,
          status: false,
          time: actionTime,
          editing: false,
        };
      }

      const name = item?.name ?? item?.value ?? item?.actionName ?? item?.actionTaken;
      if (!name) return null;

      return {
        ...item,
        name,
        selected: true,
        status: item?.status ?? false,
        time: item?.time ?? actionTime,
        editing: false,
      };
    })
    .filter(Boolean);
};

const hasSelectedAction = (actions) => (actions ?? []).some((item) => item?.selected);

const formatActionsForPreview = (actions, actionTime) => {
  return (actions ?? [])
    .map((item) => {
      const name = item?.name ?? item?.value ?? item?.actionName ?? item?.actionTaken;
      if (!name) return null;

      return {
        ...item,
        name,
        selected: true,
        status: item?.status ?? false,
        time: item?.time ?? actionTime,
        editing: false,
      };
    })
    .filter(Boolean);
};

const combinePreviewActions = (...actionGroups) => {
  const seen = new Set();

  return actionGroups
    .flat()
    .filter((item) => {
      const name = item?.name?.trim?.().replace(/\s+/g, ' ');
      if (!name) return false;

      const key = getActionDedupeKey(name);
      if (seen.has(key)) return false;

      seen.add(key);
      item.name = name;
      return true;
    });
};

const getActionDedupeKey = (name) => {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\bno\s*response\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const getActionsTakenInfoList = (actionsTakenInfo) => {
  const flattenActions = (value) => {
    if (Array.isArray(value)) return value.flatMap(flattenActions);

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];

      try {
        return flattenActions(JSON.parse(trimmed));
      } catch {
        return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
      }
    }

    if (!value || typeof value !== 'object') return [];

    const namedAction = value?.name ?? value?.value ?? value?.actionName ?? value?.actionTaken;
    if (namedAction) return [value];

    return Object.values(value).flatMap(flattenActions);
  };

  return flattenActions(actionsTakenInfo);
};

const formatEmailActionsTakenInfo = (actionsTakenInfo, actionTime) => {
  return getPreviewActions(actionsTakenInfo, actionTime);
};

const getAlarmInfoByLevel = (alarmInfo, level) => {
  const items = alarmInfo ?? [];
  for (let i = items.length - 1; i >= 0; i--) {
    if (Number(items[i]?.level) === level) return items[i];
  }
  return null;
};

const getSubmittedAudioStatus = (currentEvent, audio) => {
  if (audio?.audioConfigured !== 'T') return 'N';
  if (currentEvent?.audioStatus === 'P') return 'P';
  if (currentEvent?.audioStatus === 'F' && currentEvent?.activityDetTime) return 'F';
  return 'N';
};

const formatPreviewActions = (actions) => {
  if (!actions?.length) return '-';
  return actions.map((item) => item?.name).filter(Boolean).join(', ');
};

const CompleteEmailDialog = ({ preview, onCancel, onSubmit }) => {
  const { email, event, actionTime, notes, actionsTaken, selectedActionsTaken, emailActionsTaken, emailActionsTakenInfo } = preview;
  const [editableActions, setEditableActions] = useState(() => combinePreviewActions(
    selectedActionsTaken ?? [],
    emailActionsTaken ?? getPreviewActions(emailActionsTakenInfo, actionTime),
    (!selectedActionsTaken && !emailActionsTaken) ? actionsTaken : []
  ));
  const [actionInput, setActionInput] = useState('');
  const [draftNotes, setDraftNotes] = useState(notes || '');
  const [files, setFiles] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const submit = async () => {
    const finalActions = getFinalActions();

    if (!finalActions.length) {
      toast.warn('Choose at least one action before submitting.');
      return;
    }

    if (!draftNotes.trim()) {
      toast.warn('Add resolution notes before submitting.');
      return;
    }

    // if (!hasEmails(email?.recipientEmails)) {
    //   toast.warn('Add at least one recipient email before submitting.');
    //   return;
    // }

    setIsSubmitting(true);
    const submitted = await onSubmit({
      notes: draftNotes,
      actionsTaken: finalActions.map(({ editing, ...item }) => ({
        ...item,
        selected: true,
      })),
      files,
    });
    if (!submitted) {
      setIsSubmitting(false);
    }
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
            <button type="button" className="submit-close-btn" onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit and close event'}
            </button>
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
