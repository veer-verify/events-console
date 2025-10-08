import api from '../services/interceptor';
import { environment } from '../environment';
import {get,set} from './StorageService'

const getMetadata = async () => {
    try {
        const response = await api.get(`${environment.common_url}/getValuesListByType_1_0`);
        console.log(response);
    } catch (err) {
        console.error(err);
    }
};

const getAccessforRefreshToken = async () => {
  try {
    const url = `${environment.login_url}/getAccessforRefreshToken`;
    const user = get('user');
 
    const response = await api.post(url, null, {
      params: {
        refresh_token: user?.data.RefreshToken,
        modifiedBy: user?.data.UserId,
      },
    });
    console.log(response.data)
    return response.data; // returns only the API response body
  } catch (err) {
    console.error('Error refreshing token:', err);
    throw err;
  }
};
export {getMetadata,getAccessforRefreshToken}