const os = require('os');
const net = require('net');
const PORT = 8531;
const CHUNKSIZE = 4 * 1024 * 1024;
const HEADER_END = '\n\n';
const VERSION = '0.1.0';
const MAX_SCAN = 1024;
const STATE = {
  ERR_FS: 'ERR_FS',
  ERR_NET: 'ERR_NET',
  IDLE: 'IDLE',

  SEND_REQUEST: 'SEND_REQUEST',
  SEND: 'SEND',
  SEND_REJECT: 'SEND_REJECT',
  SEND_DONE: 'SEND_DONE',

  RECV_WAIT: 'RECV_WAIT',
  RECV_BUSY: 'RECV_BUSY',
  RECV: 'RECV',
  RECV_DONE: 'RECV_DONE',

  SENDER_STOP: 'SENDER_STOP',
  RECEIVER_STOP: 'RECEIVER_STOP',
  SENDER_END: 'SENDER_END',
  RECEIVER_END: 'RECEIVER_END'
};
const OS = os.platform();
let scanIndex = 0;
let scanSize = 10;
let scanFirstIp = 0;
const scanIsAlive = Array(scanSize).fill(false);
const scanTimeout = 300;

/**
 * Return an array of dictionary each looks like: { name, ip, netmask }.
 * @returns {Array.<{name:String, ip:String, netmask:String}>} Array of networks.
 */
function getMyNetworks() {
  var array = [];
  const interfaces = os.networkInterfaces();
  for (const network in interfaces) {
    const one = interfaces[network];
    for (const ip of one) {
      // Only ipv4 and external ip
      if (ip['family'] === 'IPv4' && !ip['internal']) {
        // LAN ip addresses start with 192, 10, or 172.
        if (ip['address'].startsWith('192') || ip['address'].startsWith('10') || ip['address'].startsWith('172')) {
          array.push({ name: network, ip: ip['address'], netmask: ip['netmask'] });
        }
      }
    }
  }
  return array;
}

/**
 * split and separate a header from buf and return the header as string and sliced buf.
 * Return null if cannot find HEADER_END.
 * @param {Buffer} buf 
 * @returns {{header:String, buf:Buffer}|null}
 */
function _splitHeader(buf) {
  const endInd = buf.indexOf(HEADER_END, 0, 'utf-8');
  if (endInd >= 0) {
    const header = buf.toString('utf8', 0, endInd);
    return { header: header, buf: buf.slice(endInd + 2) };
  };
  return null;
}

/**
 * @callback scanCallback
 * @param {String} deviceIp 
 * @param {String} deviceVersion Version of SendDone 
 * @param {String} deviceId 
 * @param {String} deviceOs 
 */

/**
 * 
 * @param {String} ip 
 * @param {String} netmask 
 * @param {String} myId 
 * @param {scanCallback} callback Callback function to call when found a device.
 */
function scan(ip, netmask, myId, callback) {
  let currentIp = (_IpStringToNumber(ip) & _IpStringToNumber(netmask)) >>> 0;
  let broadcastIp = Math.min(_IpStringToNumber(_IpBroadcastIp(ip, netmask)), currentIp + MAX_SCAN);
  let myIpInNumber = _IpStringToNumber(ip);
  ++scanIndex;
  scanIsAlive.forEach((value, index) => { scanIsAlive[index] = false; });
  scanFirstIp = currentIp;
  for (let i = 0; i < scanSize; ++i)
    _scan(currentIp + i, myIpInNumber, broadcastIp, myId, scanIndex, callback);
}
/**
 * 
 * @param {number} currentIp 
 * @param {number} myIp 
 * @param {number} broadcastIp 
 * @param {string} myId 
 * @param {number} thisIndex 
 * @param {scanCallback} callback 
 * @returns 
 */
function _scan(currentIp, myIp, broadcastIp, myId, thisIndex, callback) {
  if (broadcastIp <= currentIp)
    return;
  let thisIp = _IpNumberToString(currentIp);
  let calledNext = false;
  let socket = undefined;
  const callNext = () => {
    if (calledNext)
      return;
    calledNext = true;
    if (socket)
      socket.destroy();
    if (scanIndex !== thisIndex)
      return;
    scanIsAlive[currentIp % scanSize] = false;
    let numAlive = 0;
    scanIsAlive.map((value, index) => { if (value) ++numAlive; });
    if (numAlive === 0) {
      scanFirstIp += scanSize;
      setTimeout(() => {
        for (let i = 0; i < scanSize; ++i)
          _scan(scanFirstIp + i, myIp, broadcastIp, myId, thisIndex, callback);
      }, 0);
    }
  }
  if (currentIp == myIp) {
    callNext();
    return;
  }

  scanIsAlive[currentIp % scanSize] = true;
  socket = net.createConnection(PORT, thisIp);
  socket.setTimeout(scanTimeout, () => {
    callNext(socket);
  })
  let recvBuf = Buffer.from([]);
  socket.on('connect', () => {
    let header = {
      app: "SendDone",
      version: VERSION,
      class: "scan",
      id: myId,
      os: OS
    };
    socket.write(JSON.stringify(header) + HEADER_END);
  });
  socket.on('data', (data) => {
    recvBuf = Buffer.concat([recvBuf, data]);
    if (recvBuf.length >= 10000) {
      // Too long buffer. Close this malicious connection.
      callNext();
    }
    const ret = _splitHeader(recvBuf);
    if (ret) {
      try {
        let recvHeader = JSON.parse(ret.header);
        if (recvHeader && recvHeader.app === 'SendDone' && recvHeader.class === 'ok') {
          if (callback)
            callback(thisIp, recvHeader.version, recvHeader.id, recvHeader.os);
        }
      } catch (err) {
        // Just close this malicious connection.
      } finally {
        socket.end();
      }
    }
  })
  socket.on('error', (err) => {
    callNext();
  });
  socket.on('close', () => {
    callNext();
  });
}
/**
 * Return number representation of IPv4.
 * @param {String} ip String representation of IPv4.
 * @returns {number}
 */
function _IpStringToNumber(ip) {
  let tmp = ip.split('.');
  let ret = 0;
  for (let i = 0; i < 4; ++i) {
    ret <<= 8;
    ret += parseInt(tmp[i], 10);
  }
  return ret >>> 0;
}

/**
 * Return number representation of IPv4.
 * @param {number} ip Number representation of IPv4.
 * @returns {String}
 */
function _IpNumberToString(ip) {
  let ret = '';
  for (let i = 0; i < 4; ++i) {
    let tmp = 255 & ip;
    ret = tmp.toString(10) + ret;
    ip >>= 8;
    if (i !== 3)
      ret = '.' + ret;
  }
  return ret;
}

/**
 * Return broadcast ip address.
 * @param {String} ip 
 * @param {String} netmask 
 * @returns {String}
 */
function _IpBroadcastIp(ip, netmask) {
  return _IpNumberToString((_IpStringToNumber(ip) | (2 ** 32 - 1 - _IpStringToNumber(netmask))) >>> 0);
}

module.exports = { PORT, STATE, VERSION, HEADER_END, CHUNKSIZE, OS, getMyNetworks, scan, _splitHeader };
