const os = require('os');
const net = require('net');
const fs = require('fs').promises;
const { Stats } = require('fs');
const path = require('path');
const { cursorTo } = require('readline');
const { Socket } = require('dgram');

// Definitions of constant values.
const PORT = 8531;
const CHUNKSIZE = 1 * 1024 * 1024;
const STATE = {
    IDLE: 0,
    SEND_REQUEST: 1,
    SEND: 2,
    RECV_WAIT: 3,
    RECV: 4
};
/**
 * @type {net.Server}
 */
var serverSocket = null;
/**
 * @type {net.Socket}
 */
var clientSocket = null;
/**
 * Represent the current state of the module.
 * @type {string} 'idle' | 'send'
 */
var curState = STATE.IDLE;

/**
 * @type {number} Global variable to measure speed.
 */
var speedBytesRead = 0;
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
            socket.on('data', (data) => {
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
 * @returns {bool}
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
 */
const send = async (targetArray, receiverIp) => {
    return new Promise((resolve, reject) => {
        curState = STATE.SEND;
        clientSocket = net.createConnection(PORT, receiverIp);
        let sentMetadata = false;
        let ind = 0;
        let arrayLen = targetArray.length;
        let thisTotalReadBytes = 0;
        /**
         * @type {Stats}
         */
        let thisStat;
        /**
         * @type {fs.FileHandle}
         */
        let handle;
        clientSocket.on('connect', async () => {
            console.log('client socket connected to ' + clientSocket.remoteAddress);
            console.log('total ' + targetArray.length);
            // TODO send metadata and elements array.
        });
        clientSocket.on('data', async (data) => {
            switch (curState) {
                case STATE.SEND_REQUEST:
                    // TODO Implement.
                    break
                case STATE.SEND:
                    if (data.toString('utf-8') === 'ok') {
                        if (ind >= arrayLen) {
                            // End of send.
                            resolve(true);
                        }
                        if (!sentMetadata) {
                            // Send this element metadata.
                            thisStat = await fs.stat(targetArray[ind])
                                .catch((val) => {
                                    reject(val);
                                });
                            const elementSize = handle.size;
                            if (handle.isDirectory() || elementSize === 0) {
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
                                const header = createFileHeader(thisStat);
                                handle = await fs.open(targetArray[ind]);
                                clientSocket.write(header, 'utf-8', (err) => {
                                    reject(err);
                                });
                            }
                        }
                        else {
                            // Send file data chunk by chunk;
                            let chunk = Buffer.alloc(CHUNKSIZE);
                            const ret = await handle.read(chunk, 0, CHUNKSIZE, 0);
                            if (thisTotalReadBytes === ret.bytesRead) {
                                // EOF reached.
                                ind++;
                                sentMetadata = false;
                            }
                            clientSocket.write(header, (err) => {
                                reject(err);
                            });
                        }
                    }
                    break;
            }
        });
    });
}

/**
 * Receive one element from sender.
 * Note that this shall not be directly called from UI.
 * @param {String} downloadPath the absolute path set by user to download files into.
 */
const recvElement = (downloadPath) => {
    // TODO implement
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

module.exports = { getMyNetworks, initServerSocket, isServerSocketListening, closeServerSocket, send };