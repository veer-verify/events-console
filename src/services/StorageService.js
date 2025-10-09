import { AES, enc } from 'crypto-js';

const key = 'verifai';

// export const base_url = 'https://usstaging.ivisecurity.com';
// export const events_url = 'https://stagingmq.ivisecurity.com';

export const Encrypt = (data) => AES.encrypt(data, key).toString();
export const Decrypt = (data) => AES.decrypt(data, key).toString(enc.Utf8);

export const set = (key, data) =>localStorage.setItem(key, JSON.stringify(data));


export const get = (key) => JSON.parse(localStorage.getItem(key));
export const clear = () => localStorage.clear();