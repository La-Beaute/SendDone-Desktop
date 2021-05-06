import React, { useState } from 'react';
import path from 'path';
import './ItemView.css';

/**
 * 
 * @param {{itemArray:Array.<{path:string, dir: string, name:string, type:'file'|'directory'}>, curDir:string, setCurDir:function}} itemArray 
 * @returns 
 */
function ItemView({ itemArray, curDir, setCurDir }) {
  const showItems = itemArray.map((item) => {
    if (item.dir !== curDir) {
      return null;
    }
    if (item.type === 'directory')
      return (
        <tr className="ItemElement" key={item.path} onClick={(e) => { setCurDir(window.path.join(item.dir, item.name)); }}>
          <td>Folder</td>
          <td>{item.name}</td>
          <td><input type="checkbox"></input></td>
        </tr>
      );
    else
      return (
        <tr className="ItemElement" key={item.path}>
          <td>File</td>
          <td>{item.name}</td>
          <td><input type="checkbox"></input></td>
        </tr>
      );
  });

  const showCurDir = () => {
    let ret = [<button onClick={goHome}>Home</button>];
    if (curDir.startsWith('.'))
      return ret;
    let dirArray = curDir.split(window.path.sep);
    let cumulativeDir = '';
    for (let i = 0; i < dirArray.length; ++i) {
      ret.push('>');
      cumulativeDir = window.path.join(cumulativeDir, dirArray[i]);
      let tmp = cumulativeDir;
      ret.push(<button key={tmp} onClick={() => { setCurDir(tmp); }}>{dirArray[i]}</button>);
    }
    return ret;
  }

  const goHome = () => {
    setCurDir('.');
  }

  return (
    <div className="ItemView">
      <div>
        <div>
          {showCurDir()}
        </div>
      </div>
      <table className="ItemViewTable">
        <colgroup>
          <col style={{ width: '10%' }}></col>
          <col style={{ width: '80%' }}></col>
          <col style={{ width: '10%' }}></col>
        </colgroup>
        <thead>
          <tr className="ItemViewHead">
            <td>Type</td>
            <td>Name</td>
            <td><input type="checkbox"></input></td>
          </tr>
        </thead>
        <tbody>
          {showItems}
        </tbody>
      </table>
    </div>
  )
}

export default ItemView;