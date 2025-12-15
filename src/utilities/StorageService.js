import { AES, enc } from "crypto-js";
import moment from "moment-timezone";

const key = "verifai";

export const show_loader = false;

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
export const setStorage = (key, data) =>
  sessionStorage.setItem(key, JSON.stringify(data));
export const getStorage = (key) => JSON.parse(sessionStorage.getItem(key));
export const clearStorage = () => sessionStorage.clear();

export const getSession = () => getStorage("session");

/**
 * methods to get time by timezone
 * @param {*} timezone
 * @returns
 */
export const getTimeByTimezone = (timezone) =>
  timezone ? moment().tz(timezone)?.format("YYYY-MM-DD HH:mm:ss") : "";
export const getHour = (timezone) => moment().tz(timezone).hours();
export const getDay = (timezone) => moment().tz(timezone).day();

export const timeFormat = (monitoringData) => {
  const monitoring_hours =
    monitoringData &&
    monitoringData?.cameras.length &&
    monitoringData?.cameras[0].monitoringHoursDetails;
  if (!monitoring_hours) return;

  const weekdays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const sortedDays = Object.keys(monitoring_hours).sort(
    (a, b) => weekdays.indexOf(a) - weekdays.indexOf(b)
  );

  const allHours = {};
  sortedDays.forEach((day) => {
    const formatted = monitoring_hours[day]
      .split(",")
      .map((r) => {
        const [start, end] = r.split("-").map(Number);
        return `${String(start).padStart(2, "0")}:00 - ${String(end).padStart(
          2,
          "0"
        )}:00`;
      })
      .join(" & ");
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
          ][0].toUpperCase()}${days[days.length - 1].slice(1)}`
        : `${days[0][0].toUpperCase()}${days[0].slice(1)}`;
    return (
      <span key={index}>
        {dayStr}: {hours}
        <br />
      </span>
    );
  });
};

export const isValid = (data) => {
  if (!data) return;
  const landing = new Date(data.landingTime);
  const landingPlus10 = landing.setSeconds(landing.getSeconds() + 10);
  return (
    moment(new Date(landingPlus10))?.format("YYYY-MM-DD HH:mm:ss") >
    moment().tz(data.timezone)?.format("YYYY-MM-DD HH:mm:ss")
  );
};

export const getTagNameById = (id) => {
  if (!id) return;
  const tags = getStorage("actionTags");
  const temp = tags.actionTagCategories.flatMap(
    (item) => item.actionTagSubCategories
  );
  return temp.find((item) => item.subCategoryId === id);
  // return temp.filter((item) => item.subCategoryId === id)?.subCategoryName
};

export function formatTimestamp(input) {
  const [date, time] = input.split("_");
  const formattedTime = time.replace(/-/g, ":");
  const iso = `${date}T${formattedTime}`;
  const dateObj = new Date(iso);
  if (isNaN(dateObj)) return "Invalid Date";

  const YYYY = dateObj.getFullYear();
  const MM = String(dateObj.getMonth() + 1).padStart(2, "0");
  const DD = String(dateObj.getDate()).padStart(2, "0");

  const hh = String(dateObj.getHours()).padStart(2, "0");
  const mm = String(dateObj.getMinutes()).padStart(2, "0");
  const ss = String(dateObj.getSeconds()).padStart(2, "0");

  return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
}

export const getRole = () => {
  const session = getStorage("session");
  return session?.userLevel === 1
    ? "screener"
    : session?.userLevel === 2
    ? ""
    : session?.userLevel === 3
    ? ""
    : session?.userLevel === 4
    ? ""
    : "";
};

const timeZoneCountryList = [
  { timeZone: "Asia/Kolkata", countryCode: "IN" },
  { timeZone: "Asia/Tokyo", countryCode: "JP" },
  { timeZone: "Asia/Dubai", countryCode: "AE" },
  { timeZone: "Europe/London", countryCode: "GB" },
  { timeZone: "Europe/Paris", countryCode: "FR" },
  { timeZone: "Europe/Berlin", countryCode: "DE" },
  { timeZone: "America/New_York", countryCode: "US" },
  { timeZone: "America/Chicago", countryCode: "US" },
  { timeZone: "America/Denver", countryCode: "US" },
  { timeZone: "America/Los_Angeles", countryCode: "US" },
  { timeZone: "America/Toronto", countryCode: "CA" },
  { timeZone: "Australia/Sydney", countryCode: "AU" },
  { timeZone: "Australia/Melbourne", countryCode: "AU" },
  { timeZone: "Australia/Canberra", countryCode: "AU" },
  { timeZone: "Africa/Johannesburg", countryCode: "ZA" },
  { timeZone: "Asia/Singapore", countryCode: "SG" }
];


const getCountry = (zone) => {
  return timeZoneCountryList.find((item) => item.timeZone === zone)?.countryCode || 'US';
}


export const getZone = (timezone) => {
  const date = new Date();
  const tz = new Intl.DateTimeFormat(`en-${getCountry(timezone)}`, {
    timeZone: timezone.toString(),
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
    return tz;

};
