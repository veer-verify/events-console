import './Dashboard.css';
import { Fragment, useEffect, useState } from 'react'
import Header from '../header/Header';
import Tile from '../utilities/tile/Tile';
import axios from 'axios';
import { events_url } from '../services/StorageService';

const Dashboard = () => {

  const [eventData, setEventData] = useState([]);
  const [poolEvent, setPoolEvent] = useState(false);
  const getEvent = (type) => {
    const url = `${events_url}/queueManagement/getVms_EventsQueueData_1_0/`;
    const params = new URLSearchParams();
    params.append('queue_name', type);

    setPoolEvent(true);
    axios.get(url, { params: params }).then((res) => {
      setPoolEvent(false);
      setEventData((prev) => [...prev, res]);
    });
  };

  const handleEvent = (item, index) => {
    const filtered = eventData.filter((_, i) => index !== i);
    setEventData(filtered);
  };

  useEffect(() => {
    if (eventData.length < 2) {
      if(!poolEvent) {
        getEvent('live-events');
      }
    }
  });

  return (
    <Fragment>
      <Header></Header>

      <div className='tiles'>
        {eventData.map((item, i) => <Tile eventData={item} index={i} handleEvent={handleEvent} key={i}></Tile> )}
      </div>
    </Fragment>
  )
}

export default Dashboard;
