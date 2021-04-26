const network = require('./Network');
const { Receiver } = require('./Receiver');
var receiver = new Receiver('127.0.0.1', 'meme');
const fun = () => {
  if (receiver.getState() === network.STATE.RECV_WAIT) {
    receiver.acceptRecv('C:\\Users\\dlguswo\\Documents\\workspace\\tmp\\tmp2');
  }
  else {
    setTimeout(fun, 10);
  }
};
fun();