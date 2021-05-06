import React, { useState } from 'react';
import './ItemView.css';

function ItemView({ itemArray }) {
  const showItems = itemArray.map((item) => {
    if (item.type === 'directory')
      return <div className="ItemElement" key={item.path}>Folder | {item.name}</div>;
    else
      return <div className="ItemElement" key={item.path}>File | {item.name}</div>;
  });

  return (
    <div className="ItemView">
      {showItems}
    </div>
  )
}

export default ItemView;