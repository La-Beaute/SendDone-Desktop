const fs = require('fs').promises;
const net = require('net');
const path = require('path');
const { PORT, STATE, VERSION, HEADER_END, CHUNKSIZE, OS, _splitHeader, } = require('./Network');

class Receiver {
  /**
   * 
   * @param {string} ip 
   * @param {string} myId 
   */
  constructor(ip, myId) {
    if (!myId) {
      this._state = STATE.ERR_FS;
      return;
    }
    this._state = STATE.IDLE;
    /**
     * @type {String} my id.
     */
    this._myId = myId;
    /**
     * @type {net.Server}
     */
    this._serverSocket = null;
    /**
     * This is a socket created when a client connects to my server socket.
     * @type {net.Socket}
     */
    this._recvSocket = null;
    /**
     * Tells whether has parsed header sent from the receiver or not.
     * @type {boolean}
     */
    this._recvHeader = false;
    /**
     * @type {'ok'|'next'}
     */
    this._itemFlag = '';
    /**
     * File handle for receiving.
     * @type {fs.FileHandle}
     */
    this._itemHandle = null;
    /**
     * Array of items. Each item is composed of name, type, and size.
     * Size can be omitted if directory.
     * @type {Array.<{name:String, type:String, size:number}>}
     */
    this._itemArray = null;
    /**
     * Name of the current item.
     * @type {String}
     */
    this._itemName = null;
    /**
     * Size of the current item.
     * @type {number}
     */
    this._itemSize = 0;
    /**
     * Size of received bytes for this item.
     */
    this._itemWrittenBytes = 0;
    /**
     * Number of received items so far.
     * @type {number} 
     */
    this._numRecvItem = 0;
    /**
     * @type {String}
     */
    this._downloadPath = null;

    /**
     * The # of bytes after the previous speed measure. 
     * @type {number}
     */
    this._speedBytes = 0;
    /**
     * Previous speed measure time in millisecond.
     * @type {number} 
     */
    this._prevSpeedTime = null;
    /**
     * Previous measured speed.
     * @type {number} 
     */
    this._prevSpeed = 0;

    this._onWriteError = (err) => {
      if (err) {
        console.error('Sender: Error Occurred during writing to Socket.');
      }
    }

    this._onWriteRecvError = (err) => {
      if (err) {
        console.error('Sender: Error Occurred during writing to Socket.');
        console.error(err);
        this._recvSocket.end();
        this._recvSocket = null;
        this._state = STATE.ERR_NET;
      }
    }

    this.initServerSocket(ip);
  }

  /**
   * Initialize the server socket with the ip address.
   * Note that the port number is fixed thus cannot be changed.
   * @param {String} ip address. 
   */
  initServerSocket(ip) {
    if (!ip) {
      // ip is not set.
      return;
    }
    if (this._serverSocket) {
      if (this._serverSocket.listening) {
        console.log('Server is already on and listening!');
        return;
      }
      // this._serverSocket is not null but not listening. close it first.
      this._serverSocket.close();
    }
    this._serverSocket = net.createServer();

    // Add error handling callbacks.
    this._serverSocket.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log('this._serverSocket Error! Port is already in use!');
      }
      else {
        console.error(err);
        console.log('this._serverSocket Error! Unknown error!');
      }
      this._serverSocket = null;
      return;
    });

    // Connection established.
    this._serverSocket.on('connection', (socket) => {
      /**
       * @type {Buffer}
       */
      let recvBuf = new Buffer.from([]);
      let recvHeader = null;
      let haveParsedHeader = false;
      console.log('Receiver: connection from ' + socket.remoteAddress + ':' + socket.remotePort);

      socket.on('data', async (data) => {
        let ret = null;
        recvBuf = Buffer.concat([recvBuf, data]);
        if (!haveParsedHeader) {
          // Try to parse header and save into header.
          ret = _splitHeader(recvBuf);
          if (!ret) {
            // The header is still splitted. Wait for more data by return.
            return;
          }
          haveParsedHeader = true;
          try {
            recvHeader = JSON.parse(ret.header);
            recvBuf = ret.buf;
          } catch (err) {
            console.error('Header parsing error. Not JSON format.');
            socket.end();
            return;
          }
        }

        if (recvHeader.class === 'scan') {
          // Always responds to scan no matter the current state.
          this._handleScan(socket);
          socket.end();
          return;
        }

        // Reaching here means we now have header or already have header.
        switch (this._state) {
          case STATE.IDLE:
            switch (recvHeader.class) {
              case 'send-request':
                if (!this._validateSendRequestHeader(recvHeader)) {
                  console.error('Header error. Not valid.');
                  socket.end();
                }
                this._itemArray = recvHeader.itemArray;
                this._state = STATE.RECV_WAIT;
                this._recvSocket = socket;
                haveParsedHeader = false;
                break;
              default:
                // What the hell?
                socket.end();
                return;
            }
            break;
          case STATE.RECV_WAIT:
            switch (recvHeader.class) {
              default:
                // What the hell?
                socket.end();
                return;
            }
          case STATE.RECV:
          case STATE.SENDER_STOP:
            if (!this._isRecvSocket(socket)) {
              // Destroy this malicious socket.
              socket.destroy();
              return;
            }
            switch (recvHeader.class) {
              case 'ok':
                if (recvBuf.length === recvHeader.size) {
                  // One whole chunk received.
                  // Write chunk on disk.
                  try {
                    await this._itemHandle.appendFile(recvBuf);
                  } catch (err) {
                    // Appending to file error.
                    // In this error, there is nothing SendDone can do about it.
                    // Better delete what has been written so far,
                    // mark it failed, and go to next item.
                    // TODO mark the item failed.
                    try {
                      await this._itemHandle.close();
                      await fs.rm(path.join(this._downloadPath, this._itemName), { force: true });
                    } finally {
                      this._itemHandle = null;
                      this._itemFlag = 'next';
                      this._writeOnRecvSocket();
                      return;
                    }
                  }
                  haveParsedHeader = false;
                  this._speedBytes += recvBuf.length;
                  this._itemWrittenBytes += recvBuf.length;
                  recvBuf = Buffer.from([]);
                  this._itemFlag = 'ok';
                  this._writeOnRecvSocket();
                }
                break;
              case 'new':
                this._itemName = recvHeader.name;
                if (recvHeader.type === 'directory') {
                  try {
                    await fs.mkdir(path.join(this._downloadPath, recvHeader.name));
                  } catch (err) {
                    if (err.code === 'EEXIST') {
                      this._itemFlag = 'ok';
                      this._writeOnRecvSocket();
                    }
                    else {
                      // Making directory failed.
                      // Even making directory failed means there are serious issues.
                      this._state = STATE.ERR_FS;
                      this._recvSocket.destroy();
                    }
                    haveParsedHeader = false;
                    this._itemSize = 0;
                    this._numRecvItem++;
                    return;
                  }
                  haveParsedHeader = false;
                  this._itemFlag = 'ok';
                  this._writeOnRecvSocket();
                }
                else if (recvHeader.type === 'file') {
                  try {
                    if (this._itemHandle) {
                      this._numRecvItem++;
                      // Close previous item handle.
                      await this._itemHandle.close();
                    }
                    this._itemHandle = await fs.open(path.join(this._downloadPath, this._itemName), 'wx');
                  } catch (err) {
                    // File already exists.
                    // TODO Implement.
                    this._itemHandle = null;
                    haveParsedHeader = false;
                    this._itemFlag = 'next';
                    this._writeOnRecvSocket();
                    return;
                  }
                  haveParsedHeader = false;
                  this._itemWrittenBytes = 0;
                  this._itemSize = recvHeader.size;
                  recvBuf = Buffer.from([]);
                  this._itemFlag = 'ok';
                  this._writeOnRecvSocket();
                }
                break;
              case 'done':
                if (this._itemHandle) {
                  // Close previous item handle.
                  await this._itemHandle.close();
                }
                socket.end();
                this._state = STATE.RECV_DONE;
                break;
              case 'stop':
                this._state = STATE.SENDER_STOP;
                break;
              case 'end':
                this._state = STATE.SENDER_END;
                break;
            }
            break;
          case STATE.RECEIVER_STOP:
            switch (recvHeader.class) {
              case 'end':
                this._state = STATE.SENDER_END;
                break;
              // Ignore any other classes.
            }
            break;
          default:
            // What the hell?
            // Unhandled Receiver state case.
            socket.end();
            break;
        }
      });
      socket.on('close', () => {
        socket.end();
      });
    });

    this._serverSocket.listen(PORT, ip);
  }

  /**
   * Return whether the server socket is not null and it is listening.
   * @returns {boolean}
   */
  isExposed() {
    return this._serverSocket && this._serverSocket.listening;
  }

  /**
   * @returns {Array<{name:String, type:String, size:number}>}
   */
  getitemArray() {
    return this._itemArray;
  }
  /**
   * Close the server socket.
   */
  closeServerSocket() {
    if (this._serverSocket) {
      this._serverSocket.close(() => { this._serverSocket = null; });
    }
  }
  /**
   * Return the # of bytes per second.
   * If the # of bytes or the interval is 0, return previous measured speed.
   * @returns {number}
   */
  getSpeed() {
    const now = Date.now();
    if (now === this._prevSpeedTime || this._speedBytes === 0)
      return this._prevSpeed;
    this._prevSpeed = this._speedBytes / ((now - this._prevSpeedTime) / 1000);
    this._speedBytes = 0;
    this._prevSpeedTime = now;
    return this._prevSpeed;
  }
  /**
   * Return the current item progress out of 100.
   * @returns {number}
   */
  getItemProgress() {
    return (this._itemSize === 0 ? 100 : Math.floor(this._itemWrittenBytes / this._itemSize * 100));
  }
  /**
   * Return a string representing the total progress.
   */
  getTotalProgress() {
    return this._numRecvItem + '/' + this._itemArray.length;
  }

  /**
   * Return the current state
   */
  getState() {
    return this._state;
  }

  /**
   * Set the current state to IDLE.
   * This is needed to reinitialize the state so after an error or complete,
   * user has been acknowledged about the status and okay to do another job.
   */
  setStateIdle() {
    this._state = STATE.IDLE;
  }

  /**
   * Stop receiving for a moment.
   * @returns {boolean}
   */
  stop() {
    if (this._state === STATE.RECV) {
      this._state = STATE.RECEIVER_STOP;
      return true;
    }
    return false;
  }
  /**
   * Retume from stop.
   * @returns {boolean}
   */
  resume() {
    if (this._state === STATE.RECEIVER_STOP) {
      this._state = STATE.RECV;
      let header = { class: this._itemFlag };
      this._recvSocket.write(JSON.stringify(header) + HEADER_END, this._onWriteRecvError);
      return true;
    }
    return false;
  }
  /**
   * End receiving.
   * @returns {boolean}
   */
  async end() {
    if (this._itemHandle) {
      await this._itemHandle.close();
    }
    this._state = STATE.RECEIVER_END;
    let header = { class: 'end' };
    this._recvSocket.write(JSON.stringify(header) + HEADER_END, 'utf-8', (err) => {
      if (err) {
        this._onWriteRecvError(err);
      }
      else {
        this._socket.end();
      }
    });
  }

  /**
   * This shall be called when the user clicks receive accept button.
   * The module is going to change current state and be ready to receive.
   * @returns {boolean} Return the result of the function.
   */
  acceptRecv(downloadPath) {
    if (this._state !== STATE.RECV_WAIT || this._recvSocket === null) {
      return false;
    }
    this._state = STATE.RECV;
    this._downloadPath = downloadPath;
    this._numRecvItem = 0;
    this._speedBytes = 0;
    this._itemFlag = 'ok';
    const header = { class: this._itemFlag };
    this._recvSocket.write(JSON.stringify(header) + HEADER_END, 'utf-8', this._onWriteRecvError);
    return true;
  }
  /**
   * This shall be called when the user clicks receive reject button.
   * @returns {boolean} Return the result of the function.
   */
  rejectRecv() {
    if (this._state !== STATE.RECV_WAIT || this._recvSocket === null) {
      return false;
    }
    this._state = STATE.IDLE;
    const header = { class: 'no' };
    this._recvSocket.write(JSON.stringify(header) + HEADER_END, 'utf-8', this._onWriteRecvError);
    this._recvSocket = null;
    return true;
  }

  /**
   * Special method for writing to recvSocket while receiving.
   */
  _writeOnRecvSocket() {
    let header = null;
    switch (this._state) {
      case STATE.RECV:
        header = { class: this._itemFlag };
        this._recvSocket.write(JSON.stringify(header) + HEADER_END, 'utf-8', this._onWriteRecvError);
        break;
      case STATE.RECEIVER_STOP:
        header = { class: 'stop' };
        this._recvSocket.write(JSON.stringify(header) + HEADER_END, 'utf-8', this._onWriteRecvError);
        break;
      case STATE.RECEIVER_END:
        header = { class: 'end' };
        this._recvSocket.write(JSON.stringify(header) + HEADER_END, 'utf-8', this._onWriteRecvError);
        break;
    }
  }

  /**
   * Validate header what sender sent and return false if invalid, or return true.
   * @param {{app:String, version: String, class: String, array: Array.<{}>}} header 
   */
  _validateSendRequestHeader(header) {
    if (!header)
      return false;
    if (header.app !== 'SendDone')
      return false;
    if (header.version !== VERSION)
      return false;
    if (!header.itemArray)
      return false;
    return true;
  }

  /**
   * 
   * @param {net.Socket} socket 
   */
  _handleScan(socket) {
    let header = {
      app: "SendDone",
      version: VERSION,
      class: 'ok',
      id: this._myId,
      os: OS
    };
    socket.write(JSON.stringify(header) + HEADER_END, 'utf-8');
  }
  /**
   * Test whether this socket is connected to the current sender.
   * @param {net.Socket} socket 
   * @returns 
   */
  _isRecvSocket(socket) {
    return (this._recvSocket.remoteAddress === socket.remoteAddress) && (this._recvSocket.remotePort === socket.remotePort);
  }
}


module.exports = { Receiver };