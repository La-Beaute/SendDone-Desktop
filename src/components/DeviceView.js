import React, { useState } from 'react';

function DeviceView({ itemArray }) {
  const showItems = itemArray.map((item) => {
    return <div className="ItemElement" key={item.path}>{item.path + ' | ' + item.name}</div>;
  });


  return (
    <div className="DeviceView">
      {showItems}
    </div>
  )
}

export default DeviceView;