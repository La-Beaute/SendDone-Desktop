import React, { useState } from 'react';
import './Settings.css';
function Settings({ setShowSettings }) {
  // dummy states to save temporarily and to incur render when changing the values.
  let [downloadDirectory, setDownloadDirectory] = useState(window.localStorage.getItem('downloadDirectory'));
  let [myId, setMyId] = useState(window.localStorage.getItem('myId'));

  const saveSettings = () => {
    window.localStorage.setItem('downloadDirectory', downloadDirectory);
    window.localStorage.setItem('myId', myId);
  }

  return (
    <div className="Settings">
      <div className="Settings-Head">
        Settings
      </div>
      <div className="Settings-Body">
        <div className="Settings-Item">
          <div className="Settings-Item-Key">
            Download Path:
          </div>
          <div className="Settings-Item-Value">
            {downloadDirectory ? downloadDirectory : ''}
          </div>
          <button onClick={() => {
            window.ipcRenderer.invoke('setDownloadDirectory').then((value) => {
              if (value) {
                // window.localStorage.setItem('downloadDirectory', value);
                console.log(value);
                setDownloadDirectory(downloadDirectory => value);
              }
            });
          }} className="TextButton">Set</button>
        </div>
        <div className="Settings-Item">
          <div className="Settings-Item-Key">
            My ID:
          </div>
          <input type='text' onChange={(e) => {
            setMyId(() => e.target.value);
          }} value={myId ? myId : ''} className="Settings-Item-Value" />
        </div>
      </div>
      <div className="Settings-Buttons">
        <button onClick={() => { saveSettings(); setShowSettings(false); }} className="TextButton">Done</button>
      </div>
    </div>
  )
}

export default Settings;