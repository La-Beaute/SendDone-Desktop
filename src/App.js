import React, { useState, useEffect } from 'react';
import './App.css';
// Below lines are importing modules from window object.
// Look at 'preload.js' for more understanding.
// const networking = window.networking;
const ipcRenderer = window.ipcRenderer;
const STATE = window.STATE;
function App() {
  const [itemArray, setItemArray] = useState([]);
  const [ip, setIp] = useState(null);
  const [sendIp, setSendIp] = useState('');
  const [networks, setNetworks] = useState([]);
  const [speed, setSpeed] = useState('');
  const [serverSocketOpen, setServerSocketOpen] = useState(false);
  let stateHandler = null;
  let recvStateHandler = null;

  // Select local files.
  const openFile = async () => {
    var ret = await ipcRenderer.invoke('open-file');
    if (ret)
      setItemArray([...itemArray, ...ret]);
  };

  // Select local directories.
  /*   const openDirectory = async () => {
      var ret = await ipcRenderer.invoke('open-directory');
      if (ret)
        setItemList([...itemList, ...ret]);
    }; */

  const listItems = itemArray.map((item) => {
    return <div className="ItemElement" key={item.path}>{item.path + ' | ' + item.name}</div>;
  });

  const getNetworks = async () => {
    const ret = await ipcRenderer.invoke('get-networks');
    if (ret)
      setNetworks([...ret]);
  }

  const send = () => {
    const ret = ipcRenderer.invoke('send', { ip: sendIp, itemArray: itemArray });
    stateHandler = setInterval(() => { getSendState() }, 500);
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
      setSpeed('Done!');
      clearInterval(stateHandler);
    }
  }

  const getRecvState = async () => {
    const ret = await ipcRenderer.invoke('get-recv-state');
    if (ret.state === STATE.RECV_WAIT) {
      let input = confirm('Want to receive?');
      if (input) {
        ipcRenderer.invoke('recv');
      }
      setSpeed('Waiting...');
    }
    else if (ret.state === STATE.RECV) {
      setSpeed(ret.speed);
    }
    else if (ret.state === STATE.RECV_DONE) {
      setSpeed('Done!');
      clearInterval(stateHandler);
    }
  }

  const listNetworks = networks.map((network) => {
    return <option value={network.ip} key={network.ip}>{network.name} | {network.ip} | {network.netmask}</option>;
  });

  const handleNetworkChange = (event) => {
    setIp(event.target.value);
  }

  const initServerSocket = async () => {
    ipcRenderer.invoke('init-server-socket', { ip: ip, itemArray: itemArray });
  }

  const closeServerSocket = async () => {
    ipcRenderer.invoke('close-server-socket');
  }

  // useEffect is something like componentDidMount in React class component.
  // Add something that needs to be called after loading this component such as getting the network list.
  useEffect(() => {
    const intervalFun = async () => {
      let ret = await ipcRenderer.invoke('is-server-socket-open');
      setServerSocketOpen(ret);
      if (ret)
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
        <select onChange={handleNetworkChange}>
          {listNetworks}
        </select>
      </div>
      <div className="Box1">
        <button onClick={openFile}>Open File</button>
        {/* <button onClick={openDirectory}>Open Directory</button> */}
        <button onClick={initServerSocket}>Open Server</button>
        <button onClick={closeServerSocket}>Close Server</button>
        <div className={serverSocketOpen ? "ServerStatOpen" : "ServerStatClose"} />
      </div>
      <div className="Box1">
        <input type="text" onChange={(event) => { setSendIp(event.target.value) }}></input>
        <button onClick={send}>Send</button>
        {speed}
      </div>
      <div className="ItemList">
        {listItems}
      </div>
    </div>
  );
};

export default App;
