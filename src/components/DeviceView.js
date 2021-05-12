import React, { useState } from 'react';
import './DeviceView.css';

function DeviceView({ deviceArray }) {
  const showItems = deviceArray.map((device) => {
    return (
      <div className="DeviceElement" key={device.ip}>
        <image className="OsImage"></image>
        {device.path + ' | ' + device.name}
      </div>
    );
  });


  return (
    <div className="DeviceView">
      <div className="DeviceViewTable">

      </div>
    </div>
  )
}

export default DeviceView;