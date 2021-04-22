const net = require('net');
const fs = require('fs').promises;
const { Stat } = require('fs');
const path = require('path');
const { PORT, STATE, HEADER_END, VERSION, splitHeader } = require('./Network');
// Definitions of constant values.
const CHUNKSIZE = 1 * 1024 * 1024;

class Sender {
  constructor() {
    this._state = STATE.IDLE;
    /**
     * Message describing the most recent activity or errors.
     */
    this._message = '';
    /**
     * @type {net.Socket}
     */
    this._socket = null;
    /**
     * @type {Array.<{absPath:String, relPath:String}>}
     */
    this._elementArray = null;
    /**
     * Size of read bytes of the element.
     * @type {number}
     */
    this._elementReadBytes = 0;
    /**
     * Size of the element.
     */
    this._elementSize = 0;
    /**
     * @type {fs.FileHandle}
     */
    this._elementHandle = null;
    /**
     * @type {number} Number of bytes sent so far.
     */
    this._speedBytes = 0;
    /**
     * @type {number} Previous Date.now() value when calculating speed. 
     */
    this._speedStart = 0;
    /**
     * @type {number} Index in elementArray.
     */
    this._index = 0;
    /**
     * @type {Buffer}
     */
    this._recvBuf = new Buffer.from([]);

    this._onWriteError = (err) => {
      console.err('Sender: Error Occurred during writing to Socket.');
      console.err(err);
      this._socket.destroy(() => {
        this._socket = null;
      });
      this._state = STATE.ERR_NET;
    }

    /**
     * Handle on corrupted data from receiver.
     * NOTE that it does not set message.
     */
    this._handleNetworkErr = () => {
      this._state = STATE.ERR_NET;
      this._socket.end(() => { this._socket = null; });
    }
  }

  /**
   * Create a new client socket with the receiver ip and send elements in the array.
   * Call this API from UI.
   * @param {Array.<{absPath:String, relPath:String}>} elementArray
   * @param {String} receiverIp 
   */
  send(elementArray, receiverIp) {
    this._state = STATE.SEND_REQUEST;
    this._elementArray = elementArray;
    this._index = 0;

    if (this._elementArray.length === 0) {
      // Nothing to send and consider it send complete.
      this._state = STATE.SEND_COMPLETE;
      this._message = 'Send Complete. Nothing to sent.';
      return;
    }

    this._socket = net.createConnection(PORT, receiverIp);
    this._socket.on('connect', async () => {
      console.log('client socket connected to ' + clientSocket.remoteAddress);
      let sendRequestHeader = await this._createSendRequestHeader(this._elementArray);
      if (sendRequestHeader === null) {
        this._socket.end();
        return;
      }
      console.log('Sender: About to send total ' + this._elementArray.length);
      clientSocket.write(JSON.stringify(sendRequestHeader) + HEADER_END, 'utf-8', this._onWriteError);
    });

    this._socket.on('data', async (data) => {
      // Receiver always sends header only.
      let recvHeader = null;
      this._recvBuf = Buffer.concat([this._recvBuf, data]);
      const ret = splitHeader(this._recvBuf);
      if (!ret) {
        // Has not received header yet. just exit the function here for more data by return.
        return;
      }
      try {
        recvHeader = JSON.parse(ret.header);
      } catch (err) {
        this._message = 'Received corrupted header from receiver.';
        this._handleNetworkErr();
        return;
      }
      this._recvBuf = ret.buf;
      switch (this._state) {
        case STATE.SEND_REQUEST:
          switch (recvHeader.class) {
            case 'ok':
              this._state = STATE.SEND;
              // Send header and chunk.
              this._sendChunk();
              break;
            case 'no':
              this._state = STATE.SEND_REJECT;
              this._socket.end();
              return;
            default:
              // What the hell?
              console.error('header class value error: Unexpected value ' + recvHeader.class);
              this._state = STATE.ERR_NET;
              this._socket.end();
              return;
          }
          break;
        case STATE.SEND:
          switch (recvHeader.class) {
            case 'ok':
              // Send header and chunk.
              this._sendChunk();
              break;
            case 'stop':
              // TODO Implement
              break
            case 'end':
              // TODO Implement
              break
            case 'next':
              // TODO Implement
              break
            default:
              // What the hell?
              console.error('header class value error: Unexpected value ' + recvHeader.class);
              return;
          }
          break;
        default:
          // What the hell?
          console.error('header class value error: Unexpected value ' + recvHeader.class);
          return;
      }
    });

    this._socket.on('close', () => {
      this._socket.end();
    });

    // TODO Handle errors.
    // this._socket.on('error', (err) => {
    // })
  }

  /**
   * Return the # of bytes per second.
   * @returns {number}
   */
  getSpeed() {
    const now = Date.now();
    const ret = speedBytes / ((now - speedStart) / 1000);
    speedBytes = 0;
    speedStart = now;
    return ret;
  }

  /**
   * Return the current state
   */
  getState() {
    return this._state;
  }

  async _sendChunk() {
    let ret = null;
    if (this._index >= this._elementArray.length) {
      // End of send.
      this._state = STATE.SEND_COMPLETE;
      this._socket.end(() => { this._socket = null; });
      return;
    }
    let header = Buffer.from('ok' + HEADER_END, 'utf-8');
    let chunk = Buffer.alloc(CHUNKSIZE);
    try {
      if (!this._elementHandle) {
        this._elementHandle = await fs.open(this._elementArray[this._index].absPath);
        this._elementSize = (await this._elementHandle.stat()).size;
      }
      ret = await this._handle.read(chunk, 0, CHUNKSIZE, 0);
    } catch (err) {
      // TODO Notify receiver to go to next element.
      this._index++;
      this._elementHandle = null;
      this._elementReadBytes = 0;
      return;
    }
    chunk = chunk.slice(0, ret.bytesRead);
    this._elementReadBytes += ret.bytesRead;
    if (this._elementReadBytes === this._elementSize) {
      // EOF reached. Done reading this file.
      index++;
    }
    else if (ret.bytesRead === 0 || this._elementReadBytes > this._elementSize) {
      // File size changed. This is unexpected thus consider it an error.
      this._socket.end();
    }
    this._socket.write(Buffer.concat([header, chunk]), this._onWriteError);
  }

  /**
   * Create and return send request header.
   * Return null on Any Error.
   * @returns {Promise<{app:String, version: String, class: String, array:Array.<{name:String, type:String, size:number}>}>}
   */
  async _createSendRequestHeader() {
    let header = { app: 'SendDone', version: VERSION, class: 'send-request', array: [] };
    let elementStat = null;
    for (let element of this._elementArray) {
      try {
        elementStat = await fs.stat(element.absPath);
      } catch (err) {
        this._state = STATE.ERROR;
        this._message = 'Could not read ' + element.absPath;
        return null;
      }
      let elementHeader = null;
      if (elementStat.isDirectory()) {
        elementHeader = _createDirectoryHeader(element.relPath, elementStat.size);
      }
      else {
        elementHeader = _createFileHeader(element.relPath);
      }
      header.array.push(elementHeader);
    }
    return header;
  }

  /**
   * @param {String} relPath Relative path of the element.
   * @param {number} size Size of the element.
   * @returns {{name:String, type: String, size: number}} 
   */
  _createFileHeader(relPath, size) {
    const header = { name: relPath, type: 'file', size: size }
    return header;
  }

  /**
   * @param {String} relPath Relative path of the element.
   * @returns {{name:String, type: String}} 
   */
  _createDirectoryHeader(relPath) {
    const header = { name: relPath, type: 'directory' }
    return header;
  }
}


module.exports = { Sender };