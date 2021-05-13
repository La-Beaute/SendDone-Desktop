import React, { useState, useEffect } from 'react';
import ItemView from './components/ItemView';
import DeviceView from './components/DeviceView';
import Settings from './components/Settings';
import SendView from './components/SendView';
import RecvView from './components/RecvView';
import Blind from './components/Blind';
import './App.css';
// Below lines are importing modules from window object.
// Look at 'preload.js' for more understanding.
// const networking = window.networking;
const ipcRenderer = window.ipcRenderer;
const STATE = window.STATE;

function App() {
  const [items, setItems] = useState({});
  const [checkedItems, setCheckedItems] = useState({});
  // const [itemViewCurDir, setItemViewCurDir] = useState('');
  const [deviceArray, setdeviceArray] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [myIp, setMyIp] = useState('');
  const [netmask, setNetmask] = useState('');
  const [myId, setMyId] = useState(window.localStorage.getItem('myId'));
  const [sendIp, setSendIp] = useState('');
  const [networks, setNetworks] = useState([]);
  const [serverSocketOpen, setServerSocketOpen] = useState(false);
  const [showBlind, setShowBlind] = useState(false);
  const [disableScan, setDisableScan] = useState(false);
  const [sending, setSending] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [sendState, setSendState] = useState({});
  const [recvState, setRecvState] = useState({});

  // Select local files.
  const openFile = async () => {
    let ret = await ipcRenderer.invoke('openFile');
    setItems(items => Object.assign({}, ret, items));
  };

  // Select local directories.
  const openDirectory = async () => {
    let ret = await ipcRenderer.invoke('openDirectory');
    setItems(items => Object.assign({}, ret, items));
  }

  const deleteCheckedItems = () => {
    setItems(items => {
      let tmp = { ...items };
      for (let itemName in checkedItems) {
        delete tmp[itemName];
      }
      return tmp;
    });
    setCheckedItems({});
  }

  const getNetworks = async () => {
    /**
     * @type {Array.<>} ret
     */
    const ret = await ipcRenderer.invoke('get-networks');
    if (ret.length > 0) {
      setMyIp(ret[0].ip);
      setNetmask(ret[0].netmask);
      setNetworks([...ret]);
    }
  }

  const send = () => {
    if (!myId || !sendIp) {
      window.ipcRenderer.invoke('showMessage', !myId ? 'Cannot send without ID!' : 'Select device first!');
      return;
    }
    ipcRenderer.invoke('send', sendIp, items, myId);
    setShowBlind(true);
    setSending(true);
    getSendState();
  }

  const getSendState = async () => {
    const state = await ipcRenderer.invoke('getSendState');
    if (state.state === STATE.SEND_REQUEST || state.state === STATE.SEND)
      // Only set timeout when needed.
      setTimeout(getSendState, 500);
    setSendState(() => state);
  }

  const getRecvState = async () => {
    const state = await ipcRenderer.invoke('getRecvState');
    if (state.state === STATE.RECV_WAIT)
      setReceiving(true);
    setRecvState(() => state);
  }

  const listNetworks = networks.map((network) => {
    return <option value={network.ip + '/' + network.netmask} key={network.ip}>{network.name} | {network.ip}</option>;
  });


  const openServerSocket = async () => {
    ipcRenderer.invoke('openServerSocket', { ip: myIp });
  }

  const closeServerSocket = async () => {
    let ret = await ipcRenderer.invoke('closeServerSocket');
    return ret;
  }

  const scan = () => {
    setDisableScan(true);
    setSendIp('');
    setdeviceArray([]);
    ipcRenderer.invoke('scan', myIp, netmask, myId);
    setTimeout(() => { setDisableScan(false); }, 3000);
  }

  // useEffect is something like componentDidMount in React class component.
  // Add something that needs to be called after loading this component such as getting the network list.
  useEffect(() => {
    const intervalFun = async () => {
      let ret = await ipcRenderer.invoke('isServerSocketOpen');
      setServerSocketOpen(ret);
      if (ret)
        // Get receiver state only when the server socket is open.
        getRecvState();
    }
    ipcRenderer.on('scannedDevice', (event, deviceIp, deviceVersion, deviceId, deviceOs) => {
      setdeviceArray(() => [...deviceArray, { ip: deviceIp, version: deviceVersion, id: deviceId, os: deviceOs }]);
    });

    if (myId)
      ipcRenderer.invoke('changeMyId', myId);
    if (!myIp)
      getNetworks();
    intervalFun();
    if (!myId) {
      setShowSettings(true);
    }
    const intervalHandler = setInterval(() => { intervalFun(); }, 1000);
    return () => {
      ipcRenderer.removeAllListeners();
      clearInterval(intervalHandler);
    };
  }, [myId, myIp, deviceArray]);

  return (
    <div className="App">
      <div className="GridItem">
        <div className="Head">
          <div className="Head-Header">
            SendDone
          <br />
          Hi, {myId}!
        </div>
          <div className="Head-Buttons">
            <select onChange={(e) => {
              const [ip, netmask] = e.target.value.split('/');
              setMyIp(ip);
              setNetmask(netmask);
              if (serverSocketOpen) {
                // Close and re open server socket.
                closeServerSocket().then(openServerSocket);
              }
            }}>
              {listNetworks}
            </select>
            {serverSocketOpen
              ?
              <button onClick={closeServerSocket} className="TextButton ServerStatOpen">Close Server</button>
              :
              <button onClick={openServerSocket} className="TextButton ServerStatClose">Open Server</button>
            }
            <button onClick={() => { setShowBlind(true); setShowSettings(true); }} className="TextButton">Settings</button>
          </div>
        </div>
      </div>
      <div className="GridItem">
        <div className="Body">
          <div className="GridItem">
            <div className="Box">
              <ItemView items={items} /* curDir={itemViewCurDir} setCurDir={setItemViewCurDir} */ checkedItems={checkedItems} setCheckedItems={setCheckedItems} />
              <button onClick={deleteCheckedItems} className="TextButton"> Delete Check</button>
              <button onClick={openFile} className="TextButton">Open File</button>
              <button onClick={openDirectory} className="TextButton">Open Folder</button>
            </div>
          </div>
          <div className="GridItem">
            <div className="Box">
              <DeviceView deviceArray={deviceArray}
                sendIp={sendIp}
                setSendIp={setSendIp} />
              <button onClick={scan} disabled={disableScan} className="TextButton">Scan</button>
              <button onClick={send} className="TextButton">Send</button>
            </div>
          </div>
        </div>
      </div>
      {
        showBlind && <Blind />
      }
      {
        receiving && <RecvView
          setReceiving={setReceiving}
          setShowBlind={setShowBlind}
          state={recvState} />
      }
      {
        sending && <SendView
          setSending={setSending}
          setShowBlind={setShowBlind}
          state={sendState} />
      }
      {
        showSettings && <Settings
          setShowSettings={setShowSettings}
          setShowBlind={setShowBlind}
          myId={myId}
          setMyId={setMyId} />
      }
    </div >
  );
};

export default App;
