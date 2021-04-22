const fs = require('fs').promises;
const net = require('net');
const path = require('path');
const { PORT, STATE, VERSION, HEADER_END, CHUNKSIZE, splitHeader } = require('./Network');

class Receiver {
  /**
   * 
   * @param {string} ip 
   */
  constructor(ip) {
    this._state = STATE.IDLE;
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
     * File handle for receiving.
     * @type {fs.FileHandle}
     */
    this._elementHandle = null;
    /**
     * Array of elements. Each element is composed of name, type, and size.
     * Size can be omitted if directory.
     * @type {Array.<{name:String, type:String, size:number}>}
     */
    this._elementArray = null;
    /**
     * this._index for elementArray.
     * @type {number}
     */
    this._index = 0;
    /**
     * Total written bytes for this element.
     */
    this._elementWrittenBytes = 0;

    this._downloadPath = null;

    this._onWriteError = (err) => {
      if (err) {
        console.error('Sender: Error Occurred during writing to Socket.');
      }
    }

    this._onWriteRecvError = (err) => {
      if (err) {
        console.error('Sender: Error Occurred during writing to Socket.');
        console.error(err);
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
      let parsedHeader = false;
      let header = null;
      console.log('Receiver: connection from ' + socket.remoteAddress + ':' + socket.remotePort);

      socket.on('data', async (data) => {
        console.log('Receiver: data event');
        let ret = null;
        recvBuf = Buffer.concat([recvBuf, data]);
        if (!parsedHeader) {
          // Try to parse header and save into header.
          ret = splitHeader(recvBuf);
          if (!ret) {
            // The header is still splitted. Wait for more data by return.
            return;
          }
          parsedHeader = true;
          try {
            header = JSON.parse(ret.header);
            recvBuf = ret.buf;
          } catch (err) {
            console.error('Header parsing error. Not JSON format.');
            socket.end();
            return;
          }
        }
        // Reaching here means we now have header or already have header.
        switch (this._state) {
          case STATE.IDLE:
            switch (header.class) {
              case 'scan':
                break;
              case 'send-request':
                if (!this._validateSendRequestHeader(header)) {
                  console.error('Header error. Not valid.');
                  socket.end();
                }
                this._elementArray = header.array;
                this._index = 0;
                this._state = STATE.RECV_WAIT;
                this._recvSocket = socket;
                parsedHeader = false;
                this.acceptRecv('./');
                break;
              default:
                // What the hell?
                socket.end();
                return;
            }
            break;
          case STATE.RECV_WAIT:
            switch (header.class) {
              case 'scan':
                break;
              default:
                // What the hell?
                socket.end();
                return;
            }
            break;
          case STATE.RECV:
            switch (header.class) {
              case 'scan':
                break;
              case 'ok':
                if (!this._isRecvSocket(socket)) {
                  socket.end();
                }
                if (this._elementArray[this._index].type === 'directory') {
                  try {
                    await fs.mkdir(path.join(this._downloadPath, this._elementArray[this._index].name));
                  } catch (err) {
                    throw err;
                  }
                  parsedHeader = false;
                  // TODO Handle various states(stop, end)
                  socket.write(JSON.stringify({ class: 'ok' }) + HEADER_END, 'utf-8', this._onWriteError);
                }
                else {
                  if (recvBuf.length === CHUNKSIZE || recvBuf.length === this._elementArray[this._index].size - this._elementWrittenBytes) {
                    // One whole chunk received.
                    // Write to file and send header to sender.
                    try {
                      if (!this._elementHandle) {
                        // First chunk of the file.
                        // Open file handle.
                        this._elementHandle = await fs.open(path.join(this._downloadPath, this._elementArray[this._index].name), 'w');
                      }
                    } catch (err) {
                      // File already exists.
                      // TODO Implement.
                      socket.write(JSON.stringify({ class: 'next' }) + HEADER_END);
                      return;
                    }
                    try {
                      await this._elementHandle.appendFile(recvBuf);
                    } catch (err) {
                      // Appending to file error.
                      // In this error, there is nothing SendDone can do about it.
                      // Better delete what has been written so far,
                      // mark it failed, and go to next element.
                      // TODO mark failed.
                      await this._elementHandle.close();
                      try {
                        await fs.rm(path.join(this._downloadPath, this._elementArray[this._index].name), { force: true });
                      } finally {
                        this._elementHandle = null;
                      }
                    }
                    parsedHeader = false;
                    this._elementWrittenBytes += recvBuf.length;
                    recvBuf = Buffer.from([]);
                    if (this._elementWrittenBytes === this._elementArray[this._index].size) {
                      // Whole file is written.
                      this._index++;
                      parsedHeader = false;
                      await this._elementHandle.close();
                      this._elementHandle = null;
                    }
                    // TODO Handle various states(stop, end)
                    socket.write(JSON.stringify({ class: 'ok' }) + HEADER_END, 'utf-8', this._onWriteRecvError);
                    if (this._index >= this._elementArray.length) {
                      this._recvSocket.end();
                      this._state = STATE.RECV_COMPLETE;
                    }
                  }
                }
                break;
              case 'stop':
                // TODO Implement
                break;
              case 'end':
                // TODO Implement
                break;
              default:
                // What the hell?
                socket.end();
                break;
            }
            break;
          default:
            // What the hell?
            socket.end();
        }
        // TODO Handle state change.
      });
      socket.on('close', () => { socket.end(); });
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
  getElementArray() {
    return this._elementArray;
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
  /**
   * Set the current state to IDLE.
   * This is needed to reinitialize the state so after an error or complete,
   * user has been acknowledged about the status and okay to do another job.
   */
  setStateIdle() {
    this._state = STATE.IDLE;
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
    const header = { class: 'ok' };
    this._recvSocket.write(JSON.stringify(header) + HEADER_END, 'utf-8', this._onWriteRecvError);
    return true;
  }
  /**
   * This shall be called when the user clicks receive reject button.
   * @returns {boolean} Return the result of the function.
   */
  rejectRecv() {
    if (this._state !== STATE.RECV_WAIT || socket === null) {
      return false;
    }
    this._state = STATE.IDLE;
    const header = { class: 'no' };
    this._recvSocket.write(JSON.stringify(header) + HEADER_END, 'utf-8', this._onWriteRecvError);
    this._recvSocket = null;
    return true;
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
    if (!header.array)
      return false;
    return true;
  }

  _isRecvSocket(socket) {
    return (this._recvSocket.remoteAddress === socket.remoteAddress) && (this._recvSocket.remotePort === socket.remotePort);
  }

}


module.exports = { Receiver };