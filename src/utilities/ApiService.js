import api from '../interceptor';
import { environment } from '../environment';
import { getDay, getHour, getQueue, getSession, getStorage, getTimeByTimezone } from './StorageService';
import { toast } from 'react-toastify';


export const getAccessforRefreshToken = async () => {
  const url = `${environment.login_url}/getAccessforRefreshToken`;
  const user = getStorage('session');
  return api.post(url, null, {
    params: {
      refresh_token: user?.RefreshToken,
      modifiedBy: user?.UserId,
    },
  }).then((res) => res.data).catch((err) => console.log(err));
};

export const getMetadata = async () => {
  const url = `${environment.common_url}/getValuesListByType_1_0`;
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
  const url = `${environment.guard_monitoring_url}/getAlertCategoriesForSiteId_1_0/`;
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
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
    objectName: 'person',
    eventTag: '',
    eventTime: payload?.eventTime,
    actionTag: payload?.actionTag,
    subActionTag: payload?.subActionTag,
    actionTime: currentTime,
    userLevels: 0,
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
    console.log(err);
    // toast.error('Failed to clear event!');
  });
}


export const getVmsEventsQueueData = async () => {
  const url = `${environment.events_url}/getVms_EventsQueueData_1_0/`;
  const user = getStorage('session');
  const params = new URLSearchParams();
  params.append('queue_name', user?.queueName);
  return api.get(url, { params: params }).then((res) => res.data).catch((err) => console.log(err));
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
  params.append('currentTime', getTimeByTimezone(payload?.timezone));
  // params.append('timer', 120);
  params.append('imageName', payload?.image_list.toString());
    params.append('callingSystemDetail', 'events-console');
  return api.get(url, { params: params }).then((res) => res.data.statusCode === 200 ? res.data.emailDetails : []).catch((err) => console.log(err));
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
  formData.append('eventFromTime', getTimeByTimezone(payload?.timezone));
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
  for (var i = 0; i < payload?.screenshots?.length; i++) {
    formData.append("files", payload?.screenshots[i]);
  }
  return api.post(url, formData, { params: params }).then((res) => res).catch((err) => console.log(err));
}

export const getMonitoringInfo = async (payload) => {
  const url = `${environment.guard_monitoring_url}/getMonitoringInfo_1_0`;
  const user = getStorage('session');
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  params.append('cameraId', payload?.cameraId);
  params.append('level', user?.userLevel);
  return api.get(url, { params: params }).then((res) => res.data.statusCode === 200 ? res.data : null).catch((err) => console.log(err));
}

export const getLiveInfoForSiteAndCamera = async (payload) => {
  const url = `${environment.site_url}/getLiveInfoForSiteAndCamera_1_0`;
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  return api.get(url, { params: params }).then((res) => res.data).catch((err) => console.log(err));
}

export const playSiren = async (payload) => {
  // const url = `${environment.site_url}/play_1_0/${payload?.cameraId}`;
  const url =  payload?.audioUrl;
  return api.get(url).then((res) => res.data).catch((err) => console.log(err));
}


export const writetoRedisQueueData = async (payload) => {
 
    const url =`${environment.event_process_url}/addConsoleEvents_1_0`;
  const user = getStorage('session');
  payload.userId = user?.UserId;
  payload.level = `Level${user?.userLevel}`;
  payload.consoleType='events-console';
  payload.queueName=user?.queueName;
  return api.post(url,payload).then((res) => {
    return res.data
  }).catch((err) => console.log(err));
}


export const userLogin =async ()=>{

  const url = `${environment.event_process_url}/userLogin`;
  const user = getStorage('session');
  let payload={
    userId:0,
    userLevel:0
  }
  payload.userId = user?.UserId;
  payload.userLevel = `Level${user?.userLevel}`;
  return api.post(url,payload).then((res) => res.data).catch((err) => console.log(err));

}

export async function aliveUser(){

  const url = `${environment.event_process_url}/userActiveStatus_1_0`;
  const user = getStorage('session');
  let payload={
    userId:0
  }
  payload.userId = user?.UserId;
  try {
    const res = await api.post(url, payload);
    return res.data;
  } catch (err) {
    return console.log(err);
  }

}

export async function refreshUser(){
  const url = `${environment.event_process_url}/refresh`;
  const user = getStorage('session');
  let payload={
    userId:0
  }
  payload.userId = user?.UserId;
  try {
    const res = await api.post(url, payload);
    return res.data;
  } catch (err) {
    return console.log(err);
  }
}

export async function consumeConsoleEvents(payload){
  const url = `${environment.event_process_url}/consumeConsoleEvents_1_0`;
   const user = getStorage('session');

  payload.userId = user?.UserId;
  payload.consoleType='events-console';
  try {
    const res = await api.put(url, payload);
    return res.data;
  } catch (err) {
    return console.log(err);
  }
}