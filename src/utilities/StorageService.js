import { AES, enc } from 'crypto-js';
import moment from 'moment-timezone';

const key = 'verifai';

/**
 * methods to encrypt and decrypt data
 * @param data data to be encrypted
 * @returns encrypted data
 */
export const Encrypt = (data) => AES.encrypt(data, key).toString();
export const Decrypt = (data) => AES.decrypt(data, key).toString(enc.Utf8);

/**
 * methods to set and get data from storage
 */
export const setStorage = (key, data) =>sessionStorage.setItem(key, JSON.stringify(data));
export const getStorage = (key) => JSON.parse(sessionStorage.getItem(key));
export const clearStorage = () => sessionStorage.clear();

export const getSession = () => getStorage('session');

/**
 * methods to get time by timezone
 * @param {*} timezone 
 * @returns 
 */
export const getTimeByTimezone = (timezone) => timezone ? moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss');
export const getHour = (timezone) => moment().tz(timezone).hours();
export const getDay = (timezone) => moment().tz(timezone).day();


/**
 * method to get queue name
 * @param {*} level current queue name
 * @returns queue name to which level user nee to write
 */
// export const getQueue = (level) => {
//     if(level === 1) {
//         return '2nd-level';
//     }
//     else if(level === 2) {
//         return 'staging-dispatch';
//     }
//     else {
//         return 'staging-screener';
//     }
// }