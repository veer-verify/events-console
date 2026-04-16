import api from '../../interceptor';
import { environment } from '../../environment';
import { getDay, getHour, getStorage, getTimeByTimezone, formatTimestamp } from './StorageService';
import axios from 'axios';
import dayjs from 'dayjs';


export const getAccessforRefreshToken = async () => {
  const url = `${environment.login_url}/getAccessforRefreshToken`;
  const user = getStorage('session');
  // if (!user) return alert('');

  return api.post(url, null, {
    params: {
      refresh_token: user?.RefreshToken,
      modifiedBy: user?.UserId,
    },
  }).then((res) => res.data).catch((err) => console.log(err));
};

export const getMetadata = async () => {
  const url = `${environment.metadata_url}/getValuesListByType_1_0`;
  return api.get(url).then((res) => res.data).catch((err) => console.log(err));
};

export const getActionTagCategories = async (payload) => {
  const url = `${environment.event_process_url}/getActionTagCategories_1_0`;
  const user = getStorage('session');
  const params = new URLSearchParams();
  if (payload?.actionTagId) {
    params.append('actionTagId', payload.actionTagId)
  }
  if (user) {
    params.append('userLevel', user.userLevel)
  }
  return api.get(url, { params: params }).then((res) => res.data).catch((err) => console.log(err));
}

export const listActionTags = async (payload) => {
  const url = `${environment.guard_monitoring_url}/listActionTags_1_0`;
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  return api.get(url, { params: params }).then((res) => res.data.statusCode === 200 ? res.data : []).catch((err) => console.log(err));
}

export const getAlertCategoriesForSiteId = async (payload) => {
  const url = `${environment.guard_monitoring_url}/getAlertCategoriesForSiteId_1_0`;
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  return api.get(url, { params: params }).then((res) => res.data).catch((err) => console.log(err));
}

export const getVmsEventsQueueData = async () => {
  const url = `${environment.events_url}/getVms_EventsQueueData_1_0/`;
  const user = getStorage('session');
  const params = new URLSearchParams();
  params.append('queue_name', user?.queueName);
  return api.get(url, { params: params }).then((res) => res.data).catch((err) => console.log(err));
}

export const write2VmsDispatchQueue = async (payload) => {
  const url = `${environment.events_url}/write2Vms_EventsQueue_1_0/`;
  const user = getStorage('session');
  const currentTime = getTimeByTimezone(payload?.timezone);
  let obj = {
    siteId: payload?.siteId,
    siteName: payload?.siteName,
    cameraId: payload?.cameraId,
    objectName: payload?.objectName,
    eventTag: '',
    eventTime: payload?.eventTime,
    actionTag: payload?.actionTag,
    subActionTag: payload?.subActionTag,
    actionTime: currentTime,
    userLevels: user?.userLevel,
    httpUrl: payload?.httpUrl,
    imageUrl: payload?.image_list?.toString(),
    queue_name: payload?.queue_name,
    landingTime: payload?.landingTime ?? '',
    timezone: payload?.timezone,
    userLevelAlarmInfo: payload?.userLevelAlarmInfo,
    userName: user.UserName,
  }
  return api.post(url, obj).then((res) => {
    // toast.success("Event Cleared Successfully");
  }).catch((err) => {
    // toast.error('Failed to clear event!');
  });
}

export const updateEventFullDetails = async (payload) => {
  const url = `${environment.event_process_url}/updateEventFullDetails_1_0/`;
  const user = getStorage('session');
  const currentTime = getTimeByTimezone(payload?.timezone);
  const customAction = getStorage('custom_action');
  let obj = {
    siteName: payload?.siteName,
    siteId: payload?.siteId,
    objectName: payload?.objectName,
    cameraId: payload?.cameraId,
    eventTag: 'events-console',
    eventType: 'Event_Wall',
    actionTag: payload?.actionTag,
    subActionTag: payload?.subActionTag,
    userLevels: user.userLevel,
    falseActivityTime: customAction === 1 ? payload?.actionTagTime : '',
    suspiciousTime: customAction === 2 ? payload?.actionTagTime : '',
    callResponseTime: '',
    callNoResponseTime: '',
    eventStartTime: payload?.eventTime ?? '',
    eventEndtime: currentTime,
    emailTime: (user.userLevel === 2 && customAction === 2) ? currentTime : '',
    httpUrl: payload?.httpUrl,
    videoFile: payload?.image_list?.toString(),
    createdBy: user?.UserId,
    remarks: '',
    timezone: payload?.timezone,
    userLevelAlarmInfo: payload?.userLevelAlarmInfo
  };
  return api.post(url, obj).then((res) => {
    // toast.success('Event cleared successfully!');
  }).catch((err) => {
    // toast.error('Failed to clear event!');
  });
}

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const getEmailDataForVMSEvents = async (payload) => {

  const url = `${environment.guard_monitoring_url}/getEmailDataForVMSEvents_1_0`;
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  params.append('camerasList', payload?.cameraId);
  params.append('alertTypeId', payload?.alertTypeId);
  params.append('subTypeId', payload?.subTypeId);
  params.append('day', weekdays[getDay(payload?.timezone)]);
  params.append('hour', getHour(payload?.timezone));
  // params.append('currentTime', getTimeByTimezone(payload?.timezone));
  params.append('currentTime', formatTimestamp(payload?.eventTime));
  // params.append('timer', 120);
  params.append('imageName', payload?.image_list.toString());
  params.append('callingSystemDetail', 'events-console');
  return api.get(url, { params: params }).then((res) => res.data.statusCode === 200 ? { ...res.data.emailDetails, ...{ smsDetails: res.data.smsDetails } } : null).catch((err) => console.log(err));
}

export const eventsGenericEmail = async (payload) => {
  const url = `${environment.guard_monitoring_url}/eventsGenericEmail_1_0`;
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  params.append('day', weekdays[getDay(payload?.timezone)]);
  params.append('hour', getHour(payload?.timezone));
  params.append('currentTime', getTimeByTimezone(payload?.timezone));


  const formData = new FormData();
  formData.append('siteId', payload?.siteId);
  formData.append('cameraId', payload?.cameraId);
  formData.append('alertTypeId', payload?.alertTypeId);
  formData.append('alertSubTypeId', payload?.alertSubTypeId);
  formData.append('objectName', payload?.objectName);
  formData.append('eventTag', 'Camera-Event');
  formData.append('eventFromTime', formatTimestamp(payload?.eventTime));
  formData.append('eventToTime', getTimeByTimezone(payload?.timezone));
  formData.append('actionTag', payload?.actionTag);
  formData.append('createdBy', getStorage('session').UserId);
  formData.append('subject', payload?.emailSubject);
  formData.append('body', payload?.emailBody);
  formData.append('fields', JSON.stringify(payload?.emailFields));
  formData.append('footer', payload?.emailFooter);
  formData.append('senderEmail', payload?.senderEmail);
  formData.append("recipientEmails", payload?.recipientEmails?.join(', '));
  formData.append("Bcc", payload?.BCC?.join(','));
  formData.append("Cc", payload?.Cc?.join(','));
  formData.append('callingSystemDetail', 'events-console');
  formData.append('resolutionNotes', payload?.emailResolution);
  formData.append('actionTaken', JSON.stringify(payload?.actionTaken));
  formData.append("textDetails", JSON.stringify(payload?.smsDetails));
  formData.append('userSendMailLevel', payload?.userSendMailLevel);
  formData.append('address', JSON.stringify(payload?.address));

  for (var i = 0; i < payload?.screenshots?.length; i++) {
    formData.append("files", payload?.screenshots[i]);
  }
  //   payload?.smsDetails?.forEach((obj, index) => {
  //   for (const key in obj) {
  //     if (obj.hasOwnProperty(key)) {
  //       formData.append(`textData[${index}].${key}`, obj[key]);
  //     }
  //   }
  // });
  return api.post(url, formData, { params: params }).then((res) => res).catch((err) => console.log(err));
}

export const getMonitoringInfo = async (payload) => {
  const url = `${environment.guard_monitoring_url}/getMonitoringInfo_1_0`;
  const user = getStorage('session');
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  params.append('cameraId', payload?.cameraId);
  params.append('timezone', payload?.timezone);
  params.append('level', user?.userLevel);
  return api.get(url, { params: params }).then((res) => res?.data.statusCode === 200 ? res.data : null).catch((err) => console.log(err));
}

export const getLiveInfoForSiteAndCamera = async (payload) => {
  const url = `${environment.site_url}/getLiveInfoForSiteAndCamera_1_0`;
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  return api.get(url, { params: params }).then((res) => res.data).catch((err) => console.log(err));
}

export const playSiren = async (payload) => {
  const url = `${environment.site_url}/play_1_0/${payload?.cameraId}`;
  return api.get(url).then((res) => res.data).catch((err) => console.log(err));
}

export const userLogin = async () => {
  const url = `${environment.event_process_url}/userLogin`;
  const user = getStorage('session');
  let payload = {
    userId: 0,
    userLevel: 0
  }
  payload.userId = user?.UserId;
  payload.userLevel = `Level${user?.userLevel}`;
  return api.post(url, payload).then((res) => res.data).catch((err) => console.log(err));

}

export async function aliveUser() {
  const url = `${environment.event_process_url}/userActiveStatus_1_0`;
  const user = getStorage('session');
  let payload = {
    userId: user?.UserId,
    sessionId: user?.sessionId
  }
  try {
    const res = await api.post(url, payload);
    return res.data;
  } catch (err) {
    return console.log(err);
  }

}

export const writetoRedisQueueData = async (payload) => {
  const url = `${environment.event_process_url}/addConsoleEvents_1_0`;
  const user = getStorage('session');
  const temp = JSON.parse(JSON.stringify(payload));
  delete temp?.monitoringInfo;
  const obj = {
    userId: user?.UserId,
    userName: user?.UserName,
    sessionId: user?.sessionId,
    level: `Level${user?.userLevel}`,
    consoleType: 'events-console',
    queueName: user?.queueName,
    queueInfo: temp
  };
  return api.post(url, obj).then((res) => res.data).catch((err) => console.log(err));
}

export async function consumeConsoleEvents(payload) {
  const url = `${environment.event_process_url}/consumeConsoleEvents_1_0`;
  const user = getStorage('session');

  const obj = {
    userId: user?.UserId,
    sessionId: user?.sessionId,
    eventTime: payload?.eventTime,
    consoleType: 'events-console',
    cameraId: [payload?.cameraId],
    consumeType: payload?.consumeType ?? ''
  }

  // payload.userId = user?.UserId;
  // payload.sessionId = user?.sessionId;
  // payload.consoleType = 'events-console';

  try {
    const res = await api.put(url, obj);
    return res.data;
  } catch (err) {
    return console.log(err);
  }
}

export async function refreshUser() {
  const url = `${environment.event_process_url}/refresh`;
  const user = getStorage('session');
  let payload = {
    userId: 0
  }
  payload.userId = user?.UserId;
  try {
    const res = await api.post(url, payload);
    return res.data;
  } catch (err) {
    return console.log(err);
  }
}

export const login = async (payload) => {
  const url = `${environment.login_url}/user_login_1_0`;
  return axios.post(url, payload).then((res) => res.data).catch((err) => console.log(err));
}

export const manageUserSession = async (type) => {
  const url = `${environment.login_url}/manageUserSession_1_0`;
  const session = getStorage('session');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let obj = new Map();
  obj.set('userName', session?.UserName);
  obj.set('UidToken', session?.UidToken);
  obj.set('type', type);
  obj.set('time', getTimeByTimezone(timezone));
  obj.set('timeZone', timezone);
  obj.set('createdBy', session?.UserId);
  obj.set('callingSystemDetail', 'events-console');
  if (type === 'logOut') obj.set('sessionId', session?.sessionId);

  let payload = Object.fromEntries(obj);
  return api.post(url, payload).then((res) => res?.data?.statusCode === 200 ? res.data : null).catch(() => window.location.href = "/events-console");
}

export const getImagesForCameraId = async (payload) => {
  const url = `${environment.site_url}/getCameraImagesForCameraId_1_0`;
  return api
    .get(url, { params: { cameraId: payload?.cameraId } })
    .then((res) => res.data)
    .catch((err) => console.log(err));
}


export async function loadImageWithAuth(url) {
  const user = getStorage('session');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${user?.AccessToken}` }
  });

  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}


export async function checkCameraAudio(payload) {
  const url = `${environment.guard_monitoring_url}/checkCameraAudio_1_0`;
  return api
    .get(url, { params: { cameraId: payload?.cameraId, siteId: payload?.siteId } })
    .then((res) => res.data)
    .catch((err) => console.log(err));
}

export const getPlayback = async (payload) => {
  const url = `${environment.common_url}/custom_playback_urls_1_0`;
  let params = new URLSearchParams();
  params.append('cameraId', payload?.cameraId);
  params.append('siteId', payload?.siteId);
  params.append('eventTime', dayjs(payload?.landingTime).format('YYYY-MM-DD HH:mm:ss'));
  params.append('minutesBeforeEvent', payload?.minutesBeforeEvent ?? 2);
  params.append('currentTime', getTimeByTimezone(payload?.timezone));
  return api
    .get(url, { params: params })
    .then((res) => res.data)
    .catch((err) => console.log(err));
}