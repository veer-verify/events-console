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
export const setStorage = (key, data) => sessionStorage.setItem(key, JSON.stringify(data));
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

export const timeFormat = (monitoringData) => {
    const monitoring_hours =
        monitoringData &&
        monitoringData?.cameras.length &&
        monitoringData?.cameras[0].monitoringHoursDetails;
    if (!monitoring_hours) return;

    const weekdays = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
    ];

    const sortedDays = Object.keys(monitoring_hours).sort(
        (a, b) => weekdays.indexOf(a) - weekdays.indexOf(b)
    );

    const allHours = {};
    sortedDays.forEach((day) => {
        const formatted = monitoring_hours[day]
            .split(',')
            .map((r) => {
                const [start, end] = r.split('-').map(Number);
                return `${String(start).padStart(2, '0')}:00 - ${String(end).padStart(2, '0')}:00`;
            })
            .join(' & ');
        allHours[day] = formatted;
    });

    const grouped = {};
    sortedDays.forEach((day) => {
        const hours = allHours[day];
        if (!grouped[hours]) grouped[hours] = [];
        grouped[hours].push(day);
    });

    return Object.entries(grouped).map(([hours, days], index) => {
        const dayStr =
            days.length > 1
                ? `${days[0][0].toUpperCase()}${days[0].slice(1)}-${days[
                    days.length - 1
                ][0]
                    .toUpperCase()}${days[days.length - 1].slice(1)}`
                : `${days[0][0].toUpperCase()}${days[0].slice(1)}`;
        return (
            <span key={index}>
                {dayStr}: {hours}
                <br />
            </span>
        );
    });
};

// export const isValid = (data) => {
//     const temp = new Date(data.landingTime);
//     const time = temp.setSeconds(temp.getSeconds() + 10);
//     return new Date(time) > temp
// }

export const isValid = (data) => {
    if(!data) return;
    const landing = new Date(data.landingTime);
    const landingPlus10 = landing.setSeconds(landing.getSeconds() + 10);
    return moment(new Date(landingPlus10)).format('YYYY-MM-DD HH:mm:ss') > moment().tz(data.timezone).format('YYYY-MM-DD HH:mm:ss');
};



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