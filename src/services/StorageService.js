import { AES, enc } from 'crypto-js';
import moment from 'moment-timezone';
import { useNavigate } from 'react-router-dom';

const key = 'verifai';

export const Encrypt = (data) => AES.encrypt(data, key).toString();
export const Decrypt = (data) => AES.decrypt(data, key).toString(enc.Utf8);

export const setStorage = (key, data) =>localStorage.setItem(key, JSON.stringify(data));
export const getStorage = (key) => JSON.parse(localStorage.getItem(key));
export const clearStorage = () => localStorage.clear();

export const getUser = () => getStorage('user');
export const getTimeByTimezone = (timezone) => timezone ? moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss');
export const getHour = (timezone) => moment().tz(timezone).hours();
export const getDay = (timezone) => moment().tz(timezone).day();

export const logout = () => {}

export const getQueue = (level) => {
    if(level === 1) {
        return '2nd-level';
    }
    else if(level === 2) {
        return '3rd-level';
    }
    else if(level === 3) {
        return '4th-level';
    }
    else {
        return '1st-level';
    }
}