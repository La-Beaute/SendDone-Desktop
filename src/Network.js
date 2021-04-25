const os = require('os');
const PORT = 8531;
const CHUNKSIZE = 1 * 1024 * 1024;
const HEADER_END = '\n\n';
const VERSION = '0.1.0';
const STATE = {
  ERR_FS: -2,
  ERR_NET: -1,
  IDLE: 0,

  SEND_REQUEST: 1,
  SEND: 2,
  SEND_REJECT: 3,
  SEND_COMPLETE: 4,
  SEND_PAUSE: 5,
  SEND_END: 6,

  RECV_WAIT: 7,
  RECV: 8,
  RECV_COMPLETE: 9,
  RECV_PAUSE: 10,
  RECV_END: 11
};

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

module.exports = { PORT, STATE, VERSION, HEADER_END, CHUNKSIZE, getMyNetworks, _splitHeader };