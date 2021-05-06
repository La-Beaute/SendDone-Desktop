// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const network = require('./Network');
const { Sender } = require('./Sender');
const { Receiver } = require('./Receiver');
const isDev = require('electron-is-dev');

var mainWindow = null;
/**
 * @type {Sender}
 */
var sender = null;
/**
 * @type {Receiver}
 */
var receiver = null;
/**
 * @type {String}
 */
var myId = 'hello';
/**
 * @type {String}
 */
var myIp = '';

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: 'SendDone',
    minWidth: 800,
    minHeight: 450,
    width: 900,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false,
      nodeIntegration: false,
      contextIsolation: false
    }
  });

  if (isDev) {
    console.log('Running in development');
    // When in development, run react start first.
    // The main electron window will load the react webpage like below.
    mainWindow.loadURL('http://localhost:3000');
  }
  else {
    console.log('Running in production');
    // removeMenu will remove debugger menu too. Comment the below line if not wanted.
    // mainWindow.removeMenu();
    // When in production, run react build first.
    // The main electron window will load the react built packs like below.
    mainWindow.loadFile(path.join(__dirname, '../build/index.html')).then(() => {
      console.log('Loaded index.html');
    }).catch(() => {
      console.log('Loading index.html failed');
    });
  }
  return mainWindow;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  mainWindow = createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  })
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (receiver && receiver.isExposed())
    receiver.closeServerSocket();
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

// Handle inter process communications with renderer processes.
ipcMain.handle('open-file', () => {
  let tmp = dialog.showOpenDialogSync(mainWindow, {
    title: "Open File(s)",
    properties: ["openFile", "multiSelections"]
  });
  let ret = Array();
  for (item of tmp) {
    ret.push({ path: item, name: path.basename(item) });
  }
  return ret;
})

/* ipcMain.handle('open-directory', () => {
  return dialog.showOpenDialogSync(mainWindow, {
    title: "Open Directory(s)",
    properties: ["openDirectory", "multiSelections"]
  });
}) */

ipcMain.handle('get-networks', () => {
  return network.getMyNetworks();
})

ipcMain.handle('init-server-socket', (event, arg) => {
  if (receiver) {
    receiver.closeServerSocket();
    receiver = null;
  }
  myIp = arg;
  receiver = new Receiver(myIp, myId);
})

ipcMain.handle('close-server-socket', () => {
  if (receiver) {
    receiver.closeServerSocket();
    receiver = null;
  }
})

ipcMain.handle('is-server-socket-open', () => {
  return receiver && receiver.isExposed();
})

ipcMain.handle('set-id', (event, arg) => {
  myId = arg;
})

ipcMain.handle('send', (event, arg) => {
  // Close receiver.
  if (receiver) {
    receiver.closeServerSocket();
  }
  const ip = arg.ip;
  const itemArray = arg.itemArray;
  if (!sender) {
    sender = new Sender('id');
    sender.send(itemArray, ip);
  }
})

ipcMain.handle('get-send-state', () => {
  if (sender) {
    const state = sender.getState();
    if (state === network.STATE.SEND_REQUEST) {
      return { state: state };
    }
    if (state === network.STATE.SEND) {
      const speed = sender.getSpeed();
      return { state: state, speed: speed };
    }
    if (state === network.STATE.SEND_DONE) {
      dialog.showMessageBox(mainWindow, { message: 'Send Complete~!' });
      sender = null;
      return { state: state };
    }
    return { state: state };
  }
  return null;
})

ipcMain.handle('finish-send', () => {
  if (receiver) {
    receiver.expose(myIp);
  }
})

ipcMain.handle('get-recv-state', () => {
  if (receiver) {
    const state = receiver.getState();
    if (state === network.STATE.RECV_WAIT) {
      return { state: state, itemArray: receiver.getitemArray() };
    }
    if (state === network.STATE.RECV) {
      const speed = sender.getSpeed();
      return { state: state, speed: speed };
    }
    if (state === network.STATE.RECV_DONE) {
      dialog.showMessageBox(mainWindow, { message: 'Receive Complete~!' });
      receiver.setStateIdle();
      return { state: state };
    }
  }
  return null;
})

ipcMain.handle('recv', () => {
  if (receiver) {
    receiver.acceptRecv(app.getPath('downloads'));
  }
})