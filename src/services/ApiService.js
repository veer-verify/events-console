import api from './interceptor';
import { environment } from '../environment';
import { get, set } from './StorageService';
import moment from 'moment-timezone';

export const getMetadata = async () => {
  try {
    const response = await api.get(`${environment.common_url}/getValuesListByType_1_0`);
    return response.data;
  } catch (err) {
    console.error(err);
  }
};

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

export const write2VmsDispatchQueue = (payload) => {
  const url = `${environment.events_url}/write2Vms_DispatchQueue_1_0/`;
  let obj = {
    cameraId: payload?.cameraId,
    color: payload?.color,
    id: payload?.id,
    timestamp: payload?.time,
    queue_name: payload?.queue_name,
    timezone: payload?.timezone,
    httpUrl: payload?.httpUrl,
    siteId: payload?.siteId,
    siteName: payload?.siteName,
    userName: payload?.userName,
    actionTag: payload?.actionTag ?? '',
    actionTime: moment().tz(payload?.timezone)?.format('YYYY-MM-DD hh:mm:ss:SSS'),
    eventTag: '',
    userLevelAlarmInfo: payload?.userLevelAlarmInfo,
    userLevels: 0
  }
  return this.api.post(url, obj).then((res) => res).catch((err) => err);
}

export const getVmsEventsQueueData = () => {
  const url = `${environment.events_url}/getVms_EventsQueueData_1_0/`;
  const user = get('user');
  const params = new URLSearchParams();
  params.append('queue_name', user.queueName);
  return api.get(url, { params: params }).then((res) => res).catch((err) => err);
}

export const updateEventFullDetails = (payload) => {
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
    actionTag: payload?.actionTag,
    subActionTag: payload?.subActionTag,
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
    userLevelAlarmInfo: payload?.userLevelAlarmInfo
  };
  return api.post(url, obj).then((res) => res).catch((err) => err);
}

export const getEmailDataForVMSEvents = (payload) => {
  const url = `${environment.guard_monitoring_url}/getEmailDataForVMSEvents_1_0`;
  const params = new URLSearchParams();
  params.append('siteId', payload?.siteId);
  params.append('camerasList', payload?.camerasList);
  params.append('alertTypeId', payload?.alertTypeId);
  params.append('subTypeId', payload?.subTypeId);
  params.append('day', payload?.day);
  params.append('hour', payload?.hour);
  params.append('currentTime', payload?.currentTime);
  // params.append('timer', 120);
  params.append('imageName', payload?.imageName);
  return api.get(url, { params: params }).then((res) => res).catch((err) => err);
}

export const eventsGenericEmail = (payload) => {
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
  return api.post(url, formData, { params: params }).then((res) => res).catch((err) => err);
}