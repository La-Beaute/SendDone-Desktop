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

  const acceptRecv = () => {
    window.ipcRenderer.invoke('acceptRecv', window.localStorage.getItem('downloadDirectory'));
  }

  const rejectRecv = () => {
    window.ipcRenderer.invoke('rejectRecv');
  }

  if (state.state === STATE.RECV_WAIT)
    return (
      <div className="SendView">
        <div className="SendView-Body">
          <div>
            {state.id} wants to send you files.
          </div>
          <div>
            Do you want to accept?
          </div>
        </div>
        <div className="SendView-Buttons">
          <button onClick={rejectRecv} className="TextButton">Reject</button>
          <button onClick={acceptRecv} className="TextButton">Accept</button>
        </div>
      </div>
    )
  if (state.state === STATE.RECV)
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
          <button onClick={endRecv} className="TextButton">Cancel</button>
        </div>
      </div>
    );
  if (state.state === STATE.RECV_DONE)
    return (
      <div className="SendView">
        <div className="SendView-Body">
          Receive Done!
        </div>
        <div className="SendView-Buttons">
          <button onClick={endRecv} className="TextButton">OK</button>
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
          <button onClick={endRecv} className="TextButton">OK</button>
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
          <button onClick={endRecv} className="TextButton">OK</button>
        </div>
      </div>
    );
  if (state.state === STATE.SENDER_END)
    return (
      <div className="SendView">
        <div className="SendView-Body">
          Sender has terminated receiving.
        </div>
        <div className="SendView-Buttons">
          <button onClick={endRecv} className="TextButton">OK</button>
        </div>
      </div>
    );
  return (
    <div className="SendView">
      <div className="SendView-Body">
        W T H ?
        </div>
      <div className="SendView-Buttons">
        <button onClick={endRecv} className="TextButton">Cancel</button>
      </div>
    </div>
  );
}

export default RecvView;