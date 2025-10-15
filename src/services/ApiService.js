import api from './interceptor';
import { environment } from '../environment';
import { get, set } from './StorageService';
import moment from 'moment-timezone';

export const getAccessforRefreshToken = async () => {
  try {
    const url = `${environment.login_url}/getAccessforRefreshToken`;
    const user = get('user');
    const response = await api.post(url, null, {
      params: {
        refresh_token: user?.data.RefreshToken,
        modifiedBy: user?.data.UserId,
      },
    });
    return response.data;
  } catch (err) {
    console.error('Error refreshing token:', err);
    throw err;
  }
};

export const getMetadata = async () => {
  try {
    const response = await api.get(`${environment.common_url}/getValuesListByType_1_0`);
    return response.data;
  } catch (err) {
    console.error(err);
  }
};

export const getActionTagCategories = async (payload) => {
  const url = `${environment.event_process_url}/getActionTagCategories_1_0`;
  const user = get('user');
  const params = new URLSearchParams();
  if (payload?.actionTagId) {
    params.append('actionTagId', payload.actionTagId)
  }
  if (user) {
    params.append('userLevel', user.userLevel)
  }
  return api.get(url, { params: params }).then((res) => res.data).catch((err) => console.log(err));
}

export const getAlertCategoriesForSiteId = async (payload) => {
  const url = `${environment.guard_monitoring_url}/getAlertCategoriesForSiteId_1_0/`;
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  return api.get(url, { params: params }).then((res) => res.data).catch((err) => console.log(err));
}

export const write2VmsDispatchQueue = async (payload) => {
  const url = `${environment.events_url}/write2Vms_EventsQueue_1_0/`;
  const user = get('user');
  const currentTime = moment().tz(payload?.timezone)?.format('YYYY-MM-DD hh:mm:ss');
  let obj = {
    siteId: payload?.siteId,
    siteName: payload?.siteName,
    cameraId: payload?.cameraId,
    objectName: 'person',
    eventTag: payload?.eventTag,
    eventTime: payload?.eventTime,
    actionTag: payload?.actionTag,
    actionTime: currentTime,
    userLevels: 0,
    httpUrl: payload?.httpUrl,
    imageUrl: payload?.image_list.toString(),
    queue_name: payload?.queue_name,
    landingTime: '',
    timezone: payload?.timezone,
    userLevelAlarmInfo: [],
    userName: user.UserName,
  }
  return api.post(url, obj).then((res) => res).catch((err) => console.log(err));
}

export const getVmsEventsQueueData = async () => {
  const url = `${environment.events_url}/getVms_EventsQueueData_1_0/`;
  const user = get('user');
  const params = new URLSearchParams();
  params.append('queue_name', 'live-events');
  return api.get(url, { params: params }).then((res) => res.data).catch((err) => console.log(err));
}

export const updateEventFullDetails = async (payload) => {
  const url = `${environment.event_process_url}/updateEventFullDetails_1_0/`;
  const user = get('user');
  const currentTime = moment().tz(payload?.timezone)?.format('YYYY-MM-DD hh:mm:ss:SSS');
  const actionType = get('id');
  let obj = {
    siteName: payload?.siteName,
    siteId: payload?.siteId,
    objectName: payload?.objectName,
    cameraId: payload?.cameraId,
    eventTag: 'events-console',
    actionTag: payload?.selectedAlertType,
    subActionTag: payload?.selectedSubType,
    userLevels: user.userLevel,
    falseActivityTime: actionType === 1 ? payload?.actionTagTime : '',
    suspiciousTime: actionType === 2 ? payload?.actionTagTime : '',
    callResponseTime: '',
    callNoResponseTime: '',
    eventStartTime: payload?.timestamp,
    eventEndtime: currentTime,
    emailTime: currentTime,
    httpUrl: payload?.httpUrl,
    videoFile: payload?.image_list.toString(),
    createdBy: user?.UserId,
    remarks: '',
    eventType: '',
    timezone: payload?.timezone,
    userLevelAlarmInfo: []
  };
  return api.post(url, obj).then((res) => res).catch((err) => console.log(err));
}

export const getEmailDataForVMSEvents = async (payload) => {
  const url = `${environment.guard_monitoring_url}/getEmailDataForVMSEvents_1_0`;
  const weekday = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  const day = new Date(currentTime).getDay();
  const hour = new Date(currentTime).getHours();

  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  params.append('camerasList', payload?.cameraId);
  params.append('alertTypeId', payload?.selectedAlertType);
  params.append('subTypeId', payload?.selectedSubType);
  params.append('day', weekday[day]);
  params.append('hour', hour);
  params.append('currentTime', currentTime);
  // params.append('timer', 120);
  params.append('imageName', payload?.image_list.toString());
  return api.get(url, { params: params }).then((res) => {
    if (res.data.statusCode === 200) {
      return res.data.emailDetails;
    } else {
      return [];
    }
  }).catch((err) => {
    console.log(err)
    return [];
  });
}

export const eventsGenericEmail = async (payload) => {
  const url = `${environment.guard_monitoring_url}/eventsGenericEmail_1_0`;
  const user = get('user');
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  params.append('day', payload?.day);
  params.append('hour', payload?.hour);
  params.append('currentTime', payload?.currentTime);

  const formData = new FormData();
  formData.append('siteId', payload?.siteId);
  formData.append('cameraId', payload?.cameraId);
  formData.append('alertTypeId', payload?.alertTypeId);
  formData.append('alertSubTypeId', payload?.subTypeId);
  formData.append('objectName', payload?.objectName);
  formData.append('eventTag', 'Camera-Event');
  formData.append('eventFromTime', payload?.eventFromTime);
  formData.append('eventToTime', payload?.eventToTime);
  formData.append('actionTag', 'Information');
  formData.append('createdBy', user?.UserId);
  formData.append('subject', payload?.emailSubject);
  formData.append('body', payload?.emailBody);
  formData.append('fields', JSON.stringify(payload?.emailFields));
  formData.append('footer', payload?.emailFooter);
  formData.append('senderEmail', payload?.senderEmail);
  formData.append("recipientEmails", payload?.recipientEmails.join(', '));
  formData.append("Bcc", payload?.BCC.join(','));
  formData.append("Cc", payload?.Cc.join(','));
  for (var i = 0; i < payload?.screenshots.length; i++) {
    formData.append("files", payload?.screenshots[i].substring(payload?.screenshots[i].lastIndexOf('/') + 1));
  }
  return api.post(url, formData, { params: params }).then((res) => res).catch((err) => console.log(err));
}

export const getMonitoringInfo = async (payload) => {
  const url = `${environment.monitoring_info_url}/getMonitoringInfo_1_0`;
  const user = get('user');
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
    params.append('cameraId', payload?.cameraId);
  params.append('level', user?.userLevel);
  return api.get(url, { params: params }).then((res) => res.data).catch((err) => console.log(err));
}