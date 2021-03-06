import React, { useState } from 'react';
import './Settings.css';
function Settings({ setShowSettings, setShowBlind, myId, setMyId }) {
  // dummy states to save temporarily and to incur render when changing the values.
  let [downloadDirectory, setDownloadDirectory] = useState(window.localStorage.getItem('downloadDirectory'));
  let [tmpMyId, setTmpMyId] = useState(myId);

  const saveSettings = () => {
    window.localStorage.setItem('downloadDirectory', downloadDirectory);
    window.localStorage.setItem('myId', tmpMyId);
    setMyId(tmpMyId);
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
                setDownloadDirectory(value);
              }
            });
          }} className="TextButton">Set</button>
        </div>
        <div className="Settings-Item">
          <div className="Settings-Item-Key">
            My ID:
          </div>
          <input
            type='text'
            onChange={(e) => {
              setTmpMyId(() => e.target.value);
            }}
            value={tmpMyId ? tmpMyId : ''}
            className="Settings-Item-Value"
            maxLength={10}
          />
        </div>
      </div>
      <div className="Settings-Buttons">
        <button onClick={() => {
          if (!myId || !window.localStorage.getItem('downloadDirectory')) {
            window.ipcRenderer.invoke('showMessage', 'Please set your ID and your download directory!');
            return;
          }
          setShowBlind(false);
          setShowSettings(false);
        }} className="TextButton">Cancel</button>
        <button onClick={() => {
          if (!tmpMyId || !downloadDirectory) {
            window.ipcRenderer.invoke('showMessage', 'Please set your ID and your download directory!');
            return;
          }
          saveSettings();
          setShowBlind(false);
          setShowSettings(false);
        }} className="TextButton">Done</button>
      </div>
    </div>
  )
}

export default Settings;