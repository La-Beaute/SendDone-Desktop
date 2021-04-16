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
const HEADER_END = '\n\n';

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
 * This shall be used by receiver socket.
 * @type {Buffer}
 */
var recvBuf = new Buffer.from([]);
/**
 * Tells whether has received header from the opponent or not.
 * @type {boolean}
 */
var headerReceived = false;

/**
 * Array of elements. Each element is composed of name, type, and size.
 * Size can be omitted if directory.
 * @type {Array.<{}>}
 */
var elementArray = null;

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
 * Initialize the server socket with the ip address.
 * Note that the port number is fixed thus cannot be changed.
 * @param {String} ip address. 
 */
function initServerSocket(ip) {
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
        if (curState === STATE.IDLE && recvSocket === null) {
            // Only accept connect when the state is idle and recvSocket is null.
            // The client sent something.
            // TODO Implement and handle error.

            recvSocket = socket;
            curState = STATE.RECV_WAIT;
            recvSocket.on('data', recvSocketOnData);
        }
        else {
            socket.destroy();
        }
    });
    serverSocket.listen(PORT, ip);
}

/**
 * Handle on data event by receiver socket.
 * @param {Buffer} data 
 */
function recvSocketOnData(data) {
    recvBuf = Buffer.concat([recvBuf, data]);
    const ret = splitHeader(recvBuf);
    let header = null;
    if (!ret) {
        // The header is still splitted. Wait for more data by return.
        return;
    }
    try {
        header = JSON.parse(ret.header);
    } catch (err) {
        console.error('Header parsing error. Not JSON format.');
        recvSocket.destroy(() => {
            console.log('Destroyed connection for bad header.');
        });
    }
    switch (curState) {
        case STATE.IDLE:
            // Sender must have sent send request header.
            if (!validateSendRequestHeader(header)) {
                console.error('Header error. Not valid.');
                recvSocket.destroy(() => {
                    console.log('Destroyed connection for bad header.');
                });
            }
            elementArray = header.array;
            curState = STATE.RECV_WAIT;
            break;
        case STATE.RECV:
            break;
        default:
            // What the hell?
            throw new Error('Unexpected current state');
    }
    // Assign array to global variable, so that the UI can get it.

}

/**
 * Return whether the server socket is not null and it is listening.
 * @returns {boolean}
 */
function isServerSocketListening() {
    return serverSocket && serverSocket.listening;
}

/**
 * Close the server socket.
 */
function closeServerSocket() {
    if (serverSocket) {
        serverSocket.close();
        serverSocket = null;
    }
}
/**
 * Create a new client socket with the receiver ip and send elements in the array.
 * Call this API from UI.
 * @param {Array.<String>} elementArray 
 * @param {String} receiverIp 
 * @returns {boolean|Error} Whether send succeeded or failed, or error.
 */
async function send(elementArray, receiverIp) {
    return new Promise((resolve, reject) => {
        curState = STATE.SEND_REQUEST;
        clientSocket = net.createConnection(PORT, receiverIp);
        let sentMetadata = false;
        let ind = 0;
        let thisTotalReadBytes = 0;
        let thisSize = 0;
        let thisStat;
        /**
         * @type {fs.FileHandle}
         */
        let handle;
        recvBuf = new Buffer.from([]);

        const sendElementMetadata = async () => {
            thisStat = await fs.stat(elementArray[ind]).catch((err) => {
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
                handle = await fs.open(elementArray[ind]).catch((val) => {
                    reject(val);
                });
                clientSocket.write(header, 'utf-8', (err) => {
                    reject(err);
                });
            }
        };
        /**
         * Create and return send request header.
         * @param {Array.<String>} elementArray 
         * @returns {Promise<{app:String, version: String, class: String, array:Array.<>}>}
         */
        const createSendRequestHeader = async (elementArray) => {
            let header = { app: "SendDone", version: VERSION, class: "send-request", array: [] };
            for (let element of elementArray) {
                // TODO Implement name handling for directory and file inside directory.
                //      If there is an element inside a directory,
                //      receiver has to know that the file goes into that directory.
                thisStat = await fs.stat(element).catch((err) => {
                    reject(err);
                });
                let thisElement = null;
                if (thisStat.isDirectory()) {
                    thisElement = createDirectoryHeader(thisStat);
                }
                else {
                    thisElement = createFileHeader(thisStat);
                }
                header.array.push(thisElement);
            }
            return header;
        }

        if (elementArray.length === 0) {
            // Nothing to send. But do not consider it an error.
            resolve(true);
        }

        clientSocket.on('connect', async () => {
            console.log('client socket connected to ' + clientSocket.remoteAddress);
            console.log('total ' + elementArray.length);
            let sendRequestHeader = await createSendRequestHeader(elementArray);
            clientSocket.write(JSON.stringify(sendRequestHeader) + HEADER_END, 'utf-8', (err) => {
                if (err)
                    reject(err);
            });
        });

        clientSocket.on('data', async (data) => {
            // Receiver always send data with header.
            let header = null;
            recvBuf = Buffer.concat([recvBuf, data]);
            const ret = splitHeader(recvBuf);
            if (!ret) {
                // Has not received header yet. just exit the function here for more data by return.
                return;
            }
            header = JSON.parse(ret.header)
            recvBuf = ret.buf;
            switch (curState) {
                case STATE.SEND_REQUEST:
                    switch (header.class) {
                        case 'ok':
                            curState = STATE.SEND;
                            break;
                        case 'no':
                            curState = STATE.SEND_REJECT;
                            break;
                        default:
                            // What the hell?
                            console.error('header class value error: Unexpected value ' + header.class);
                            reject(new Error('Header class value error'));
                    }
                case STATE.SEND:
                    switch (header.class) {
                        case 'ok':
                            if (ind >= elementArray.length) {
                                // End of send.
                                curState = STATE.SEND_COMPLETE;
                                resolve(true);
                            }
                            if (!sentMetadata) {
                                // Send this element metadata.
                                await sendElementMetadata();
                            }
                            else {
                                // Send file data chunk by chunk with header;
                                header = Buffer.from('ok' + HEADER_END, 'utf-8');
                                let chunk = Buffer.alloc(CHUNKSIZE);
                                const ret = await handle.read(chunk, 0, CHUNKSIZE, 0);
                                chunk = chunk.slice(0, ret.bytesRead);
                                thisTotalReadBytes += ret.bytesRead;
                                if (thisTotalReadBytes === thisSize) {
                                    // EOF reached. Done reading this file.
                                    ind++;
                                    sentMetadata = false;
                                }
                                else if (ret.bytesRead === 0 || thisTotalReadBytes > thisSize) {
                                    // File size changed. This is unexpected thus consider it an error.
                                    reject(new Error('File changed'));
                                }
                                clientSocket.write(Buffer.concat([header, chunk]), (err) => {
                                    if (err)
                                        reject(err);
                                    speedBytes += ret.bytesRead;
                                });
                            }
                            break;
                        case 'stop':
                            // TODO Implement
                            break
                        case 'end':
                            // TODO Implement
                            break
                        default:
                            // What the hell?
                            console.error('header class value error: Unexpected value ' + header.class);
                            reject(new Error('Header class value error'));
                    }
                default:
                    // What the hell?
                    reject(new Error('Unexpected current state'));
            }
        });
    });
}

/**
 * Return the # of bytes per second.
 * @returns {number}
 */
function getSpeed() {
    const now = Date.now();
    const ret = speedBytes / ((now - speedStart) / 1000);
    speedBytes = 0;
    speedStart = now;
    return ret;
}

/**
 * Return the current state
 */
function getCurState() {
    return curState;
}

/**
 * Set the current state to IDLE.
 * This is needed to reinitialize the state so after an error or complete,
 * user has been acknowledged about the status and okay to do another job.
 */
function setCurStateIdle() {
    curState = STATE.IDLE;
}
/**
 * This shall be called when the user clicks receive accept button.
 * The module is going to change current state and be ready to receive.
 * @returns {boolean} Return the result of the function.
 */
function acceptRecv() {
    if (curState !== STATE.RECV_WAIT || recvSocket === null) {
        return false;
    }
    curState = STATE.RECV;
    const header = { class: 'ok' };
    recvSocket.write(JSON.stringify(header) + HEADER_END, 'utf-8');
    return true;
}

/**
 * This shall be called when the user clicks receive reject button.
 * @returns {boolean} Return the result of the function.
 */
function rejectRecv() {
    if (curState !== STATE.RECV_WAIT || recvSocket === null) {
        return false;
    }
    curState = STATE.IDLE;
    const header = { class: 'no' };
    recvSocket.write(JSON.stringify(header) + HEADER_END, 'utf-8', () => {
        recvSocket.destroy(() => {
            recvSocket = null;
        });
    });
    return true;
}

/**
 * Validate header what sender sent and return false if invalid, or return true.
 * @param {{app:String, version: String, class: String, array: Array.<{}>}} header 
 */
function validateSendRequestHeader(header) {
    if (!header)
        return false;
    if (!header.app !== 'SendDone')
        return false;
    if (!header.version !== VERSION)
        return false;
    if (!header.array)
        return false;
    return true;
}

/**
 * 
 * @param {Stats} stat fs.Stats object of the element.
 * @returns {{name:String, type: String, size: number}} 
 */
function createFileHeader(stat) {
    const header = { name: path.basename(targetPath), type: "file", size: stat.size }
    return header;
}

/**
 * 
 * @param {Stats} stat fs.Stats object of the element.
 * @returns {{name:String, type: String}} 
 */
function createDirectoryHeader(stat) {
    const header = { name: path.basename(targetPath), type: "directory" }
    return header;
}

/**
 * split and separate a header from buf and return the header as a string form from the buf.
 * Return null if cannot find HEADER_END.
 * @param {Buffer} buf 
 * @returns {{header:String, buf:Buffer}|null}
 */
function splitHeader(buf) {
    const index = buf.indexOf(HEADER_END, 0, 'utf-8');
    if (index >= 0) {
        const header = buf.toString('utf8', 0, index);
        return { header: header, buf: buf.slice(index + 2) };
    };
    return null;
}

module.exports = { getMyNetworks, initServerSocket, isServerSocketListening, closeServerSocket, send, getSpeed, getCurState, setIdle: setCurStateIdle, acceptRecv };