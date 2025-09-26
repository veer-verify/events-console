import { AES, enc } from 'crypto-js';

const key = 'verifai';

export const Encrypt = (data) => AES.encrypt(data, key).toString();
export const Decrypt = (data) => AES.decrypt(data, key).toString(enc.Utf8);