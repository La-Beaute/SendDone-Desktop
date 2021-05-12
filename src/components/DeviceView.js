import React, { useState } from 'react';
import './DeviceView.css';

/**
 * Each device has the following keys:
 *  ip, version, id, os 
 */
function DeviceView({ deviceArray, sendIp, setSendIp }) {
  const showDevices = deviceArray.map((device) => {
    return (
      <div className={"DeviceElement" + (sendIp === device.ip ? " DeviceSelected" : "")} key={device.ip} onClick={(e) => { setSendIp(device.ip); console.log(e.currentTarget.className); }}>
        <img className="Osimg"></img>
        <div className="DeviceElement-Box">
          <div className="DeviceElement-ID">
            {device.id}
          </div>
          <div className="DeviceElement-IP-Ver">
            {'IP: ' + device.ip + ' | version: ' + device.version}
          </div>
        </div>
      </div>
    );
  });


  return (
    <div className="DeviceView">
      <div className="DeviceViewTable">
        {showDevices}
      </div>
    </div>
  )
}

export default DeviceView;