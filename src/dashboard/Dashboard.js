import './Dashboard.css';
import { Fragment, useEffect, useState } from 'react'
import Header from '../header/Header';
import Tile from '../utilities/tile/Tile';
import axios from 'axios';
import { get } from '../services/StorageService';
import { environment } from '../environment';
import { updateEventFullDetails } from '../services/ApiService';


const Dashboard = () => {

  const [eventData, setEventData] = useState([]);
  const [poolEvent, setPoolEvent] = useState(false);
  const [escalation, setEscalation] = useState(false);
  const [eventIndex, setEventIndex] = useState(null);

  const getEvent = (type) => {
    const url = `${environment.events_url}/getVms_EventsQueueData_1_0/`;
    const params = new URLSearchParams();
    params.append('queue_name', type);

    setPoolEvent(true);
    axios.get(url, { params: params }).then((res) => {
      setPoolEvent(false);
      setEventData((prev) => [...prev, ...res.data]);
    });
  };

  const closeEscalation = () => {
    setEscalation(false);
  }

  const handleEvent = async (item, index) => {
    const tag = get('id');
    setEventIndex(index);
    if(tag === 1) {
      const filtered = eventData.filter((_, i) => index !== i);
      setEventData(filtered);
      const res = await updateEventFullDetails(item);
      console.log(res);
    } else {
      setEscalation(true);
    }
  };

  useEffect(() => {
    if (!poolEvent && eventData.length < 2) {
        getEvent('live-events');
      }
  }, [eventData.length < 2]);

  return (
    <Fragment>
      <Header></Header>

      <div className='tiles'>
        {eventData.map((item, i) =>
          <Tile
            key={i}
            index={i}
            eventIndex={eventIndex}
            currentEvent={item}
            handleEvent={handleEvent}
            escalation={escalation}
            closeEscalation={closeEscalation}
            />)}
      </div>
    </Fragment>
  )
}

export default Dashboard;
