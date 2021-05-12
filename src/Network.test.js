const network = require('./Network');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const { Sender } = require('./Sender');
const { Receiver } = require('./Receiver');

const receiverIp = '127.0.0.1';
const tmp1 = path.join(__dirname, 'tmp1');
const tmp2 = path.join(__dirname, 'tmp2');

const sender = new Sender('sender');
const receiver = new Receiver(receiverIp, 'receiver');
receiver.openServerSocket(receiverIp);

async function delTmpDir() {
  try {
    await fs.rmdir(tmp1, { recursive: true, force: true });
    await fs.rmdir(tmp2, { recursive: true, force: true });
  } catch (err) {
    // Do nothing.
  }
}

async function mkTmpDir() {
  // Create two temporary directories which are used for testing.
  try {
    await fs.mkdir(tmp1);
    await fs.mkdir(tmp2);
  } catch (err) {
    delTmpDir();
    return false;
  }
  return true;
}

const acceptReceiving = (done) => {
  let state = receiver.getState().state;
  if (state === network.STATE.RECV_WAIT) {
    console.log('Accepting receiving.');
    receiver.acceptRecv(tmp2);
    resetReceiver(done);
  }
  else if (state === network.STATE.IDLE) {
    setTimeout(() => { acceptReceiving(done) }, 10);
  }
  else {
    done(new Error('receiver state is not valid:', state));
  }
};

async function resetReceiver(done) {
  let state = receiver.getState().state;
  if (state === network.STATE.RECV_DONE) {
    receiver.setStateIdle();
    done();
  }
  else if (state === network.STATE.RECV) {
    setTimeout(() => { resetReceiver(done) }, 10);
  }
  else {
    done(new Error('receiver state is not valid:', state));
  }
}

const acceptReceivingStop = (done) => {
  let state = receiver.getState().state;
  if (state === network.STATE.RECV_WAIT) {
    console.log('Accepting receiving.');
    receiver.acceptRecv(tmp2);
    setTimeout(() => {
      console.log('receiver stop:', receiver.stop());
    }, 1000);
    setTimeout(() => {
      console.log('receiver resume:', receiver.resume());
    }, 2000);
    setTimeout(() => {
      console.log('sender stop:', sender.stop());
    }, 3000);
    setTimeout(() => {
      console.log('sender resume:', sender.resume());
    }, 4000);
    setTimeout(() => {
      console.log('sender stop:', sender.stop());
    }, 5000);
    setTimeout(() => {
      console.log('sender resume:', sender.resume());
    }, 6000);
    setTimeout(() => {
      console.log('receiver stop:', receiver.stop());
    }, 7000);
    setTimeout(() => {
      console.log('receiver resume:', receiver.resume());
    }, 8000);
    resetReceiverStop(done);
  }
  else if (state === network.STATE.IDLE) {
    setTimeout(() => { acceptReceivingStop(done) }, 10);
  }
  else {
    done(new Error('receiver state is not valid:', state));
  }
};

async function resetReceiverStop(done) {
  let state = receiver.getState().state;
  if (state === network.STATE.RECV_DONE) {
    receiver.setStateIdle();
    done();
  }
  else if (state === network.STATE.RECV) {
    setTimeout(() => { resetReceiverStop(done) }, 10);
  }
  else if (state === network.STATE.RECEIVER_STOP || state === network.STATE.SENDER_STOP) {
    setTimeout(() => { resetReceiverStop(done) }, 10);
  }
  else {
    done(new Error('receiver state is not valid:', state));
  }
}

async function diffFiles(orig, dest, expectedLen) {
  const origBuf = await fs.readFile(orig);
  const destBuf = await fs.readFile(dest);
  if ((expectedLen === undefined || destBuf.length === expectedLen) && origBuf.equals(destBuf))
    return true;
  throw new Error('Items differ ' + orig + ' ' + dest);
}

describe('Send one file', () => {
  before(async () => {
    await delTmpDir();
    if (!(await mkTmpDir())) {
      console.error('Failed Upon Making tmporary directories!');
      return;
    }
  });

  after(async () => {
    await delTmpDir();
  });

  it('Send 1KB size file', (done) => {
    const orig = path.join(tmp1, '1KB');
    const len = 1024;
    const buf = crypto.randomBytes(len);

    fs.writeFile(orig, buf, { flag: 'w' }).then(() => {
      sender.send({ '1KB': { name: '1KB', dir: '.', path: orig } }, receiverIp);
      acceptReceiving(done);
    });
  }).timeout(1000);

  it('Check 1KB size file', async () => {
    const orig = path.join(tmp1, '1KB');
    const dest = path.join(tmp2, '1KB');
    const len = 1024;
    return await diffFiles(orig, dest, len);
  }).timeout(1000);

  it('Send 513MB size file', (done) => {
    const orig = path.join(tmp1, '513MB');
    const len = 513 * 1024 * 1024;
    const buf = crypto.randomBytes(len);

    fs.writeFile(orig, buf, { flag: 'w' }).then(() => {
      sender.send({ '513MB': { name: '513MB', dir: '.', path: orig } }, receiverIp);
      acceptReceiving(done);
    });
  }).timeout(200000);

  it('Check 513MB size file', async () => {
    const orig = path.join(tmp1, '513MB');
    const dest = path.join(tmp2, '513MB');
    const len = 513 * 1024 * 1024;
    return await diffFiles(orig, dest, len);
  }).timeout(120000);

  it('Send 0B size file', (done) => {
    const orig = path.join(tmp1, '0B');
    const dest = path.join(tmp2, '0B');
    const len = 0;
    const buf = crypto.randomBytes(len);

    fs.writeFile(orig, buf, { flag: 'w' }).then(() => {
      sender.send({ '0B': { name: '0B', dir: '.', path: orig } }, receiverIp);
      acceptReceiving(done);
    });
  }).timeout(1000);

  it('Check 0B size file', async () => {
    const orig = path.join(tmp1, '0B');
    const dest = path.join(tmp2, '0B');
    const len = 0;
    return await diffFiles(orig, dest, len);
  }).timeout(1000);
})

describe('Send directories', () => {
  before(async () => {
    await delTmpDir();
    if (!(await mkTmpDir())) {
      console.error('Failed Upon Making tmporary directories!');
      return;
    }
  });

  after(async () => {
    await delTmpDir();
  });

  it('Send one directory', (done) => {
    const orig = path.join(tmp1, 'dir');

    fs.mkdir(orig).then(() => {
      sender.send({ 'dir': { name: 'dir', dir: '.', path: orig } }, receiverIp);
      acceptReceiving(done);
    });
  });

  it('Check one directory', async () => {
    const dest = path.join(tmp2, 'dir');
    await fs.access(dest);
    await fs.rmdir(dest);
  });

  it('Send three directories', (done) => {
    let arr = Array(3);
    async function tmp() {
      for (let i = 0; i < 3; ++i) {
        arr[i] = path.join(tmp1, 'dir' + i);
        await fs.mkdir(arr[i]);
      }
      return;
    }
    tmp().then(() => {
      let items = {};
      for (let i = 0; i < 3; ++i) {
        items['dir' + i] = { name: 'dir' + i, dir: '.', path: arr[i] };
      }
      sender.send(items, receiverIp);
      acceptReceiving(done);
    })
  });

  it('Check three directories', async () => {
    for (let i = 0; i < 3; ++i) {
      let dest = path.join(tmp2, 'dir' + i);
      await fs.access(dest);
    }
  });

  it('Send recursive directories', (done) => {
    const orig = path.join(tmp1, 'dirr');
    const orig1 = path.join(tmp1, 'dirr', 'dirrr');

    fs.mkdir(orig).then(() => {
      fs.mkdir(orig1).then(() => {
        sender.send({ 'dirr': { name: 'dirr', dir: '.', path: orig, items: { 'dirrr': { name: 'dirrr', dir: 'dirr', path: orig1 } } } }, receiverIp);
        acceptReceiving(done);
      });
    });
  });

  it('Check recursive directories', async () => {
    const dest = path.join(tmp2, 'dirr');
    const dest1 = path.join(tmp2, 'dirr', 'dirrr');
    await fs.access(dest);
    await fs.access(dest1);
  });
})

describe('Test stop while sending', () => {
  before(async () => {
    await delTmpDir();
    if (!(await mkTmpDir())) {
      console.error('Failed Upon Making tmporary directories!');
      return;
    }
  });

  after(async () => {
    await delTmpDir();
    receiver.closeServerSocket();
  });

  it('Stop while sending 513MB size file', (done) => {
    const orig = path.join(tmp1, '513MB');
    const len = 513 * 1024 * 1024;
    const buf = crypto.randomBytes(len);

    fs.writeFile(orig, buf, { flag: 'w' }).then(() => {
      sender.send({ '513MB': { name: '513MB', dir: '.', path: orig } }, receiverIp);
      acceptReceivingStop(done);
    });
  }).timeout(30000);

  it('Check 513MB size file', async () => {
    const orig = path.join(tmp1, '513MB');
    const dest = path.join(tmp2, '513MB');
    const len = 513 * 1024 * 1024;
    return await diffFiles(orig, dest, len);
  }).timeout(10000);

  var len = 3000;
  let items = {};
  it('Stop while sending 3000 files and directories', (done) => {
    async function tmp() {
      for (let i = 0; i < len; ++i) {
        let dirFlag = (crypto.randomInt(0, 2) === 1 ? true : false);
        if (dirFlag) {
          items['dir' + i] = { name: 'dir' + i, dir: '.' };
          items['dir' + i].path = path.join(tmp1, items['dir' + i].name);
          await fs.mkdir(items['dir' + i].path);
        }
        else {
          const fileLen = crypto.randomInt(0, 1000000);
          const buf = crypto.randomBytes(fileLen);
          items['dir' + i] = { name: 'dir' + i, dir: '.' };
          items['dir' + i].path = path.join(tmp1, items['dir' + i].name);
          await fs.writeFile(items['dir' + i].path, buf);
        }
      }
      return;
    }
    tmp().then(() => {
      console.log('Creating done');
      sender.send(items, receiverIp);
      acceptReceivingStop(done);
    })
  }).timeout(30000);

  it('Check 3000 files and directories', async () => {
    for (let itemName in items) {
      if (items[itemName].name.includes('dir')) {
        await fs.access(path.join(tmp2, items[itemName].name));
      }
      else {
        await diffFiles(items[itemName].path, path.join(tmp2, items[itemName].name));
      }
    }
  }).timeout(10000);
})
