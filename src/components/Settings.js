import React, { useState, useEffect } from 'react';
import './Settings.css';
function Settings({ setShowSettings }) {
  return (
    <div className="Settings">
      <div>
        Settings
      </div>
      <div>
        <button onClick={() => { setShowSettings(false); }} className="TextButton">Done</button>
      </div>
    </div>
  )
}

export default Settings;