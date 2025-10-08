import api from '../services/interceptor';
import { environment } from '../environment';

const getMetadata = async () => {
    try {
        const response = await api.get(`${environment.common_url}/getValuesListByType_1_0`);
        console.log(response);
    } catch (err) {
        console.error(err);
    }
};

export {getMetadata}