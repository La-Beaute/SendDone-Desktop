const os = require('os');
const net = require('net');
const fs = require('fs').promises;
const path = require('path');
const port = 8531;
const chunkSize = 1 * 1024 * 1024;
var serverSocket = null;
var socketBusy = false;

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

        // The opponent sent something.
        socket.on('data', (data) => {
            data = data.toString('utf-8');
            console.log(data);
        });
    });
    serverSocket.listen(port, ip);
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

const send = async (sendArray, receiverIp) => {
    var clientSocket = net.createConnection(port, receiverIp);
    // TODO send metadata and elements array.
    clientSocket.on('connect', async () => {
        console.log('total ' + sendArray.length);
        for (let i = 0; i < sendArray.length; ++i) {
            await sendElement(sendArray[i], clientSocket);
        }
    });
}

/**
 * Send the target element to socket opponent.
 * This shall not be directly called from UI.
 * @param {String} targetPath absolute path of the target.
 * @param {net.Socket} socket connected socket.
 * @returns {Promise<bool>}
 */
const sendElement = (targetPath, socket) => {
    return new Promise(async (resolve, reject) => {
        if (!path.isAbsolute(targetPath))
            reject(false);
        const stat = await fs.stat(targetPath).catch(() => {
            // Cannot read file.
            reject(false);
        });
        if (stat.isFile()) {
            const header = createFileHeader(stat);
            socket.write(header, 'utf-8');
            let chunkInd = 0;
            const handle = await fs.open(targetPath);
            const onData = async (data) => {
                if (data.toString('utf8') === 'ok') {
                    let chunk = new Buffer.alloc(chunkSize);
                    const ret = await handle.read(chunk, 0, chunkSize, null);
                    if (ret.bytesRead === 0) {
                        // EOF reached. Close the file.
                        await handle.close();
                        console.log('EOF');
                        // Remove listener.
                        socket.removeListener('data', onData);
                        resolve(true);
                    }
                    else {
                        socket.write(chunk, () => {
                            console.log('chunk ' + (chunkInd++) + 'sent complete');
                        });
                    }
                }
            };
            // Add listener.
            socket.on('data', onData);
        }
        else if (stat.isDirectory()) {
            // TODO implement.
            resolve(true);
        }
        else {
            // What the hell?
            resolve(false);
        }
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
 * @param {fs.Stats} stat fs.Stats object of the element.
 * @returns {String} 
 */
const createFileHeader = (stat) => {
    const name = path.basename(targetPath);
    const size = stat.size;
    const nameHeader = 'name:' + name + '\r\n';
    const typeHeader = 'type:file\r\n';
    const sizeHeader = 'size:' + size + '\r\n\r\n';
    return nameHeader + typeHeader + sizeHeader;
}

module.exports = { getMyNetworks, initServerSocket, isServerSocketListening, closeServerSocket, send };