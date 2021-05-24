import React from 'react';
import './SendView.css';
const STATE = window.STATE;

/**
 * state has keys:
 * state, speed, progress, totalProgress, name
 */
function SendView({ setShowBlind, setSending, state }) {

  const endSend = () => {
    window.ipcRenderer.invoke('endSend');
    setSending(false);
    setShowBlind(false);
    window.ipcRenderer.invoke('setReceiverIdle');
  }

  if (state.state === STATE.SEND) {
    let sendSpeed = '';
    if (parseFloat(state.speed) > 1048576)
      sendSpeed = (parseFloat(state.speed) / 1048576).toFixed(2).toString() + ' MB/S'
    else if (parseFloat(state.speed) > 1024)
      sendSpeed = (parseFloat(state.speed) / 1024).toFixed(2).toString() + ' KB/S'
    else
      sendSpeed = parseFloat(state.speed).toFixed(2).toString() + ' B/S'
    return (
      <div className="SendView">
        <div className="SendView-Body">
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
            Send Speed : {sendSpeed}
          </div>
          <div>
            Total Progress : {state.totalProgress}
          </div>
        </div>
        <div className="SendView-Buttons">
          <button onClick={endSend} className="TextButton">Cancel</button>
        </div>
      </div>
    )
  }
  if (state.state === STATE.SEND_REJECT)
    return (
      <div className="SendView">
        <div className="SendView-Body">
          Receiver has rejected your request.
        </div>
        <div className="SendView-Buttons">
          <button onClick={endSend} className="TextButton">OK</button>
        </div>
      </div>
    );
  if (state.state === STATE.SEND_DONE)
    return (
      <div className="SendView">
        <div className="SendView-Body">
          Send Done!
        </div>
        <div className="SendView-Buttons">
          <button onClick={endSend} className="TextButton">OK</button>
        </div>
      </div>
    );

  if (state.state === STATE.ERR_NET)
    return (
      <div className="SendView">
        <div className="SendView-Body">
          Network Error. Cannot send.
        </div>
        <div className="SendView-Buttons">
          <button onClick={endSend} className="TextButton">OK</button>
        </div>
      </div>
    );
  if (state.state === STATE.ERR_FS)
    return (
      <div className="SendView">
        <div className="SendView-Body">
          File System Error. Cannot send.
        </div>
        <div className="SendView-Buttons">
          <button onClick={endSend} className="TextButton">OK</button>
        </div>
      </div>
    );
  if (state.state === STATE.RECEIVER_END)
    return (
      <div className="SendView">
        <div className="SendView-Body">
          Receiver has terminated receiving.
        </div>
        <div className="SendView-Buttons">
          <button onClick={endSend} className="TextButton">OK</button>
        </div>
      </div>
    );
  return (
    <div className="SendView">
      <div className="SendView-Body">
        Waiting...
        </div>
      <div className="SendView-Buttons">
        <button onClick={endSend} className="TextButton">Cancel</button>
      </div>
    </div>
  );
}

export default SendView;