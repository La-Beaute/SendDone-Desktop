import React, { useState, useEffect } from 'react';
import ItemView from './components/ItemView';
import './App.css';
// Below lines are importing modules from window object.
// Look at 'preload.js' for more understanding.
// const networking = window.networking;
const ipcRenderer = window.ipcRenderer;
const STATE = window.STATE;
let startTime;

function App() {
  const [items, setItems] = useState({});
  const [checkedItems, setCheckedItems] = useState({});
  const [itemViewCurDir, setItemViewCurDir] = useState('');
  const [myIp, setMyIp] = useState('');
  const [myId, setMyId] = useState('your ID');
  const [sendIp, setSendIp] = useState('');
  const [networks, setNetworks] = useState([]);
  const [speed, setSpeed] = useState('');
  const [serverSocketOpen, setServerSocketOpen] = useState(false);
  let sendStateHandler = null;

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
    const ret = await ipcRenderer.invoke('get-networks');
    if (ret)
      setNetworks([...ret]);
  }

  const send = () => {
    ipcRenderer.invoke('send', { ip: sendIp, items: items });
    startTime = Date.now();
    sendStateHandler = setInterval(() => { getSendState() }, 500);
  }

  const getSendState = async () => {
    const ret = await ipcRenderer.invoke('get-send-state');
    if (ret.state === STATE.SEND_WAIT) {
      setSpeed('Waiting...');
    }
    else if (ret.state === STATE.SEND) {
      setSpeed(ret.speed);
    }
    else if (ret.state === STATE.SEND_DONE) {
      console.log(ret.state);
      setSpeed((Date.now() - startTime) + 'ms');
      clearInterval(sendStateHandler);
    }
  }

  const getRecvState = async () => {
    const ret = await ipcRenderer.invoke('getRecvState');
    if (ret.state === STATE.RECV_WAIT) {
      let input = window.confirm('Want to receive?');
      if (input) {
        ipcRenderer.invoke('acceptRecv');
      }
      else {
        ipcRenderer.invoke('rejectRecv');
      }
    }
    else if (ret.state === STATE.RECV) {
      setSpeed(ret.speed);
    }
    else if (ret.state === STATE.RECV_DONE) {
      setSpeed('Done!');
    }
    else if (ret.state === STATE.ERR_FS) {
      // TODO Handle error.
    }
    else if (ret.state === STATE.ERR_NET) {
      // TODO Handle error.
    }
  }

  const listNetworks = networks.map((network) => {
    return <option value={network.ip} key={network.ip}>{network.name} | {network.ip}</option>;
  });

  const openServerSocket = async () => {
    ipcRenderer.invoke('openServerSocket', { ip: myIp });
  }

  const closeServerSocket = async () => {
    let ret = await ipcRenderer.invoke('closeServerSocket');
    return ret;
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
    getNetworks();
    intervalFun();
    const intervalHandler = setInterval(() => { intervalFun(); }, 1000);
    return () => clearInterval(intervalHandler);
  }, []);


  return (
    <div className="App">
      <div className="Head">
        <div className="Head-Header">
          SendDone
          <br />
          Hi, {myId}!
        </div>
        <div className="Head-Buttons">
          <select onChange={(e) => {
            setMyIp(e.target.value);
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
          <button className="TextButton">Settings</button>
        </div>
      </div>
      <div className="Main">
        <div className="Box1">
          <ItemView items={items} curDir={itemViewCurDir} setCurDir={setItemViewCurDir} checkedItems={checkedItems} setCheckedItems={setCheckedItems} />
          <button onClick={() => { deleteCheckedItems(); }} className="TextButton"> Delete Check</button>
          <button onClick={openFile} className="TextButton">Open File</button>
          <button onClick={openDirectory} className="TextButton">Open Folder</button>
        </div>
        <div className="Box2">
          <input type="text" onChange={(event) => { setSendIp(event.target.value); }}></input>
          <button onClick={send} className="TextButton">Send</button>
          {speed}
        </div>
      </div>
    </div>
  );
};

export default App;
