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

  if (state.state === STATE.SEND)
    return (
      <div className="SendView">
        <div className="SendView-Body">
          <div>
            {state.name}
          </div>
          <div>
            {state.progress}%
          </div>
          <div>
            {state.speed}
          </div>
          <div>
            {state.totalProgress}
          </div>
        </div>
        <div className="SendView-Buttons">
          <button onClick={endSend} className="TextButton">Cancel</button>
        </div>
      </div>
    )
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