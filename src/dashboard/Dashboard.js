import './Dashboard.css';
import React, { Fragment } from 'react'
import Header from '../header/Header';
import Tile from '../utilities/tile/Tile';

const Dashboard = () => {
  return (
    <Fragment>
      <Header></Header>


      <div className='tiles'>
        <Tile></Tile>
        <Tile></Tile>
      </div>
    </Fragment>
  )
}

export default Dashboard;
