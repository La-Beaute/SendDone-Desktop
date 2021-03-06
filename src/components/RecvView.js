import React from 'react';
import './RecvView.css';
const STATE = window.STATE;

/**
 * state has keys:
 * state, speed, progress, totalProgress, name
 * or 
 * state, id, items
 */
function RecvView({ setShowBlind, setReceiving, state }) {

  const endRecv = () => {
    window.ipcRenderer.invoke('endRecv');
    window.ipcRenderer.invoke('setReceiverIdle');
    setReceiving(false);
    setShowBlind(false);
  }

  const quit = () => {
    window.ipcRenderer.invoke('setReceiverIdle');
    setReceiving(false);
    setShowBlind(false);
  }

  const acceptRecv = () => {
    const downloadDirectory = window.localStorage.getItem('downloadDirectory');
    window.ipcRenderer.invoke('acceptRecv', downloadDirectory);
  }

  const rejectRecv = () => {
    window.ipcRenderer.invoke('rejectRecv');
  }

  if (state.state === STATE.RECV_WAIT)
    return (
      <div className="RecvView">
        <div className="RecvView-Body">
          <div>
            {state.id} wants to send you files.
          </div>
          <div>
            Do you want to accept?
          </div>
        </div>
        <div className="RecvView-Buttons">
          <button onClick={rejectRecv} className="TextButton">Reject</button>
          <button onClick={acceptRecv} className="TextButton">Accept</button>
        </div>
      </div>
    )
  if (state.state === STATE.RECV) {
    let speed = parseFloat(state.speed);
    if (speed > 1048576)
      speed = (speed / 1048576).toFixed(2).toString() + ' MB/S'
    else if (speed > 1024)
      speed = (speed / 1024).toFixed(2).toString() + ' KB/S'
    else
      speed = speed.toFixed(2).toString() + ' B/S'
    return (
      <div className="RecvView">
        <div className="RecvView-Body">
          <div className='ItemName'>
            {state.name}
          </div>
          <div>
            {state.progress}%
          </div>
          <div className="ProgressBar">
            <div className="insideBar" style={{ width: `${state.progress}%` }}></div>
          </div>
          <div>
            Download Speed : {speed}
          </div>
          <div>
            Total Progress : {state.totalProgress}
          </div>
        </div>
        <div className="RecvView-Buttons">
          <button onClick={endRecv} className="TextButton">Cancel</button>
        </div>
      </div>
    );
  }
  if (state.state === STATE.RECV_DONE)
    return (
      <div className="RecvView">
        <div className="RecvView-Body">
          Receive Done!
        </div>
        <div className="RecvView-Buttons">
          <button onClick={quit} className="TextButton">OK</button>
        </div>
      </div>
    );

  if (state.state === STATE.ERR_NET)
    return (
      <div className="RecvView">
        <div className="RecvView-Body">
          Network Error. Cannot receive.
        </div>
        <div className="RecvView-Buttons">
          <button onClick={quit} className="TextButton">OK</button>
        </div>
      </div>
    );
  if (state.state === STATE.ERR_FS)
    return (
      <div className="RecvView">
        <div className="RecvView-Body">
          File System Error. Cannot receive.
        </div>
        <div className="RecvView-Buttons">
          <button onClick={quit} className="TextButton">OK</button>
        </div>
      </div>
    );
  if (state.state === STATE.SENDER_END)
    return (
      <div className="RecvView">
        <div className="RecvView-Body">
          Sender has terminated receiving.
        </div>
        <div className="RecvView-Buttons">
          <button onClick={quit} className="TextButton">OK</button>
        </div>
      </div>
    );
  return (
    <div className="RecvView">
      <div className="RecvView-Body">
        W T H ?
        </div>
      <div className="RecvView-Buttons">
        <button onClick={quit} className="TextButton">Cancel</button>
      </div>
    </div>
  );
}

export default RecvView;