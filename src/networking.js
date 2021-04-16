const os = require('os');
const net = require('net');
const fs = require('fs').promises;
const { Stats } = require('fs');
const path = require('path');

// Definitions of constant values.
const PORT = 8531;
const CHUNKSIZE = 1 * 1024 * 1024;
const STATE = {
    IDLE: 0,
    SEND_REQUEST: 1,
    SEND: 2,
    SEND_REJECT: 3,
    RECV_WAIT: 4,
    RECV: 5,
    SEND_COMPLETE: 6,
    RECV_COMPLETE: 7,
    ERROR: 8
};
// TODO Can't get it somewhere else?
const VERSION = '0.1.0';
// const OK = 'ok\n\n';
/**
 * Represent the current state of the module.
 * @type {number} 
 */
var curState = STATE.IDLE;
/**
 * @type {net.Server}
 */
var serverSocket = null;
/**
 * @type {net.Socket}
 */
var clientSocket = null;
/**
 * This is a socket created when a client connects to my server socket.
 * @type {net.Socket}
 */
var recvSocket = null;


/**
 * @type {number} Global variable to measure speed.
 */
var speedBytes = 0;
/**
 * @type {number} Global variable to measure speed.
 */
var speedStart = 0;

/**
 * Return an array of dictionary each looks like: { name, ip, netmask }.
 * @returns {Array.<{name:String, ip:String, netmask:String}>} Array of networks.
 */
const getMyNetworks = () => {
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
 * Initialize the server socket with the ip address.
 * Note that the port number is fixed thus cannot be changed.
 * @param {String} ip address. 
 */
const initServerSocket = (ip) => {
    if (!ip) {
        // ip is not set.
        return;
    }
    if (serverSocket) {
        if (serverSocket.listening) {
            console.log('Server is already on and listening!');
            return;
        }
        // serverSocket is not null but not listening. close it first.
        serverSocket.close();
    }
    serverSocket = net.createServer();

    // Add error handling callbacks.
    serverSocket.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log('Serversocket Error! Port is already in use!');
        }
        else {
            console.error(err);
            console.log('Serversocket Error! Unknown error!');
        }
        serverSocket = null;
        return;
    });

    // Connection established.
    serverSocket.on('connection', (socket) => {
        if (curState === STATE.IDLE) {
            // Only accept connect when the state is idle.
            // The client sent something.
            // TODO Implement and handle error.
            recvSocket = socket;
            curState = STATE.RECV_WAIT;
            recvSocket.on('data', (data) => {
                data = data.toString('utf-8');
                console.log(data);
            });
        }
        else {
            socket.destroy();
        }
    });
    serverSocket.listen(PORT, ip);
}

/**
 * Return whether the server socket is not null and it is listening.
 * @returns {boolean}
 */
const isServerSocketListening = () => {
    return serverSocket && serverSocket.listening;
}

/**
 * Close the server socket.
 */
const closeServerSocket = () => {
    if (serverSocket) {
        serverSocket.close();
        serverSocket = null;
    }
}
/**
 * Create a new client socket with the receiver ip and send elements in the array.
 * Call this API from UI.
 * @param {Array.<String>} targetArray 
 * @param {String} receiverIp 
 * @returns {boolean|Error} Whether send succeeded or failed, or error.
 */
const send = async (targetArray, receiverIp) => {
    return new Promise((resolve, reject) => {
        curState = STATE.SEND_REQUEST;
        clientSocket = net.createConnection(PORT, receiverIp);
        let sentMetadata = false;
        let ind = 0;
        let arrayLen = targetArray.length;
        let thisTotalReadBytes = 0;
        let thisSize = 0;
        let thisStat;
        let recvBuf = new Buffer.from([]);
        /**
         * @type {fs.FileHandle}
         */
        let handle;

        const sendElementMetadata = async () => {
            thisStat = await fs.stat(targetArray[ind]).catch((err) => {
                reject(err);
            });
            thisSize = handle.size;
            if (handle.isDirectory() || thisSize === 0) {
                // no Need actual data to give.
                // Go to next element immediately.
                ind++
                sentMetadata = false;
                const header = thisStat.isDirectory() ? createDirectoryHeader(thisStat) : createFileHeader(thisStat);
                clientSocket.write(header, 'utf-8', (err) => {
                    reject(err);
                });
            }
            else {
                sentMetadata = true;
                const header = createFileHeader(thisStat);
                handle = await fs.open(targetArray[ind]).catch((val) => {
                    reject(val);
                });
                clientSocket.write(header, 'utf-8', (err) => {
                    reject(err);
                });
            }
        };
        /**
         * Create send request header and return.
         * @param {Array.<String>} targetArray 
         */
        const createSendRequestHeader = async (targetArray) => {
            let header = 'SendDone' + '\n' + VERSION + '\n';
            header += 'type:send' + '\n' + 'length:' + targetArray.length + '\n';
            for (let element in targetArray) {
                // TODO Implement name handling for directory and file inside directory.
                // TODO Add file size.
                // If there is an element inside a directory,
                // receiver has to know that the file goes into that directory.
                const stat = await fs.stat(element).catch((err) => {
                    reject(err);
                });
                let name = path.basename(element);
                header += 'name:' + name + '\n';
                if (stat.isDirectory()) {
                    header += 'type:directory' + '\n';
                }
                else {
                    header += 'type:file' + '\n';
                }
            }
            header + '\n';
            return header;
        }

        if (arrayLen === 0) {
            // Nothing to send. But do not consider it an error.
            resolve(true);
        }

        clientSocket.on('connect', async () => {
            console.log('client socket connected to ' + clientSocket.remoteAddress);
            console.log('total ' + arrayLen);
            // TODO send metadata and elements array.
            await createSendRequestHeader(targetArray);
        });
        clientSocket.on('data', async (data) => {
            // Receiver always send data with header.
            recvBuf = Buffer.concat([recvBuf, data]);
            const ret = splitHeader(recvBuf);
            let header = null;
            if (!ret) {
                // Has not received header yet. just exit the function here for more data by return.
                return;
            }
            header = ret.header
            recvBuf = ret.buf;
            switch (curState) {
                case STATE.SEND_REQUEST:
                    if (header.includes('ok')) {
                        curState = STATE.SEND;
                    }
                    else {
                        curState = STATE.SEND_REJECT;
                    }
                    break
                case STATE.SEND:
                    if (header.includes('ok')) {
                        if (ind >= arrayLen) {
                            // End of send.
                            curState = STATE.SEND_COMPLETE;
                            resolve(true);
                        }
                        if (!sentMetadata) {
                            // Send this element metadata.
                            await sendElementMetadata();
                        }
                        else {
                            // Send file data chunk by chunk;
                            header = Buffer.from('ok\n\n', 'ascii');
                            let chunk = Buffer.alloc(CHUNKSIZE);
                            const ret = await handle.read(chunk, 0, CHUNKSIZE, 0);
                            chunk = chunk.slice(0, ret.bytesRead);
                            thisTotalReadBytes += ret.bytesRead;
                            if (thisTotalReadBytes === thisSize) {
                                // EOF reached. Done reading this file.
                                ind++;
                                sentMetadata = false;
                            }
                            if (ret.bytesRead === 0 || thisTotalReadBytes > thisSize) {
                                // File size changed. This is unexpected thus consider it an error.
                                reject(new Error('File changed'));
                            }
                            clientSocket.write(Buffer.concat([header, chunk]), (err) => {
                                if (err)
                                    reject(err);
                                speedBytes += ret.bytesRead;
                            });
                        }
                    }
                    break;
                default:
                    reject(new Error('Unexpected current state'));
            }
        });
    });
}

/**
 * Return the # of bytes per second.
 * @returns {number}
 */
const getSpeed = () => {
    const now = Date.now();
    const ret = speedBytes / ((now - speedStart) / 1000);
    speedBytes = 0;
    speedStart = now;
    return ret;
}

/**
 * Return the current state
 */
const getCurState = () => {
    return curState;
}

/**
 * Set the current state to IDLE.
 * This is needed to reinitialize the state so after an error or complete,
 * user has been acknowledged about the status and okay to do another job.
 */
const setCurStateIdle = () => {
    curstate = STATE.IDLE;
}
/**
 * This shall be called when the user clicks receive accept button.
 * The module is going to change current state and be ready to receive.
 * @returns {boolean} Return the result of the function.
 */
const acceptRecv = () => {
    if (curState !== STATE.RECV_WAIT || recvSocket === null) {
        return false;
    }
    curstate = STATE.RECV;
    recvSocket.write('ok', 'utf-8');
}


/**
 * 
 * @param {Stats} stat fs.Stats object of the element.
 * @returns {String} 
 */
const createFileHeader = (stat) => {
    const name = path.basename(targetPath);
    const size = stat.size;
    const nameHeader = 'name:' + name + '\n';
    const typeHeader = 'type:file\n';
    const sizeHeader = 'size:' + size + '\n\n';
    return nameHeader + typeHeader + sizeHeader;
}

/**
 * split and separate a header from buf and return the header as a string form from the buf.
 * return null if cannot find delimiter '\n\n'.
 * @param {Buffer} buf 
 * @returns {{header:String, buf:Buffer}|null}
 */
const splitHeader = (buf) => {
    const index = buf.indexOf('\n\n', 0, 'ascii');
    if (index >= 0) {
        const header = buf.toString('ascii', 0, index);
        return { header: header, buf: buf.slice(index + 2) };
    };
    return null;
}

/**
 * 
 * @param {Stats} stat fs.Stats object of the element.
 * @returns {String} 
 */
const createDirectoryHeader = (stat) => {
    const name = path.basename(targetPath);
    const size = stat.size;
    const nameHeader = 'name:' + name + '\n';
    const typeHeader = 'type:directory\n\n';
    return nameHeader + typeHeader + sizeHeader;
}



module.exports = { getMyNetworks, initServerSocket, isServerSocketListening, closeServerSocket, send, getSpeed, getCurState, setIdle: setCurStateIdle, acceptRecv };