const network = require('./Network');
const { Sender } = require('./Sender');
const { Receiver } = require('./Receiver');
var sender = new Sender();
const list = [
  { path: 'C:/Users/dlguswo/Documents/workspace/tmp/tmp1/L06-MPIandOpenMP.pdf', name: 'L06-MPIandOpenMP.pdf' },
  { path: 'C:\\Users\\dlguswo\\Documents\\workspace\\tmp\\tmp1\\sub', name: 'sub' },
  { path: 'C:\\Users\\dlguswo\\Documents\\workspace\\tmp\\tmp1\\sub\\distribution-13.png', name: 'sub/distribution-13.png' },
  { path: 'C:/Users/dlguswo/Documents/workspace/tmp/tmp1/yt1s.com - Colorado By Drone  Telluride Aspen Ice Lakes Blue Lakes Trail  More 4K Travel Footage_1080p (1).mp4', name: 'yt1s.com - Colorado By Drone  Telluride Aspen Ice Lakes Blue Lakes Trail  More 4K Travel Footage_1080p (1).mp4' },
]
sender.send(list, '127.0.0.1');
