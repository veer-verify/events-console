import './Dashboard.css';
import React, { Fragment, useEffect, useState } from 'react'
import Header from '../header/Header';
import Tile from '../utilities/tile/Tile';
import axios from 'axios';

const Dashboard = () => {

  const tags = [
    {
      path: 'icons/false.png'
    },
    {
      path: 'icons/suspicious.png'
    },
    {
      path: 'icons/live.png'
    },
    {
      path: 'icons/siren.png'
    },
  ];

  const [eventData, setEventData] = useState([]);
  const [poolEvent, setPoolEvent] = useState(false);
  const getEvent = (type) => {
    const url = 'https://stagingmq.ivisecurity.com/queueManagement/getVms_EventsQueueData_1_0/';
    const params = new URLSearchParams();
    params.append('queue_name', type);

    setPoolEvent(true);
    axios.get(url, { params: params }).then((res) => {
      setPoolEvent(false);
      setEventData((prev) => [...prev, res])
    })
  };

  const handleEvent = (index) => {
    const filtered = eventData.filter((_, i) => index !== i)
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
        {/* <p>Hello</p> */}
        {eventData.map((item, i) => <Tile eventData={item} tags={tags} index={i} handleEvent={handleEvent} key={i}></Tile> )}
      </div>
    </Fragment>
  )
}

export default Dashboard;
