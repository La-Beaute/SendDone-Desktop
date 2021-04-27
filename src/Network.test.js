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
  if (receiver.getState() === network.STATE.RECV_WAIT) {
    console.log('Accepting receiving.');
    receiver.acceptRecv(tmp2);
  }
  else if (receiver.getState() === network.STATE.IDLE) {
    setTimeout(acceptReceiving, 10);
  }
  else {
    done(new Error('receiver state is not valid:', receiver.getState()));
  }
};

async function resetReceiver(orig, dest, done) {
  if (receiver.getState() === network.STATE.RECV_COMPLETE) {
    receiver.setStateIdle();
    done();
  }
  else {
    setTimeout(() => { resetReceiver(orig, dest, done) }, 10);
  }
}

async function diffFiles(orig, dest) {
  const origBuf = await fs.readFile(orig);
  const destBuf = await fs.readFile(dest);
  return origBuf.equals(destBuf);
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
    receiver.closeServerSocket();
  });

  it('Send 1KB size file', (done) => {
    const orig = path.join(tmp1, '1KB');
    const dest = path.join(tmp2, '1KB');
    const buf = crypto.randomBytes(1024);

    fs.writeFile(orig, buf, { flag: 'w' }).then(() => {
      sender.send([{ name: '1KB', path: orig }], receiverIp);
      acceptReceiving(done);
      resetReceiver(orig, dest, done);
    });
  }).timeout(1000);

  it('Check 1KB size file', async () => {
    const orig = path.join(tmp1, '1KB');
    const dest = path.join(tmp2, '1KB');
    return await diffFiles(orig, dest);
  }).timeout(1000);

  it('Send 513MB size file', (done) => {
    const orig = path.join(tmp1, '513MB');
    const dest = path.join(tmp2, '513MB');
    const buf = crypto.randomBytes(513 * 1024 * 1024);

    fs.writeFile(orig, buf, { flag: 'w' }).then(() => {
      sender.send([{ name: '513MB', path: orig }], receiverIp);
      acceptReceiving(done);
      resetReceiver(orig, dest, done);
    });
  }).timeout(200000);

  it('Check 513MB size file', async () => {
    const orig = path.join(tmp1, '513MB');
    const dest = path.join(tmp2, '513MB');
    return await diffFiles(orig, dest);
  }).timeout(120000);

  it('Send 0B size file', (done) => {
    const orig = path.join(tmp1, '0B');
    const dest = path.join(tmp2, '0B');
    const buf = crypto.randomBytes(0);

    fs.writeFile(orig, buf, { flag: 'w' }).then(() => {
      sender.send([{ name: '0B', path: orig }], receiverIp);
      acceptReceiving(done);
      resetReceiver(orig, dest, done);
    });
  }).timeout(1000);

  it('Check 0B size file', async () => {
    const orig = path.join(tmp1, '0B');
    const dest = path.join(tmp2, '0B');
    return await diffFiles(orig, dest);
  }).timeout(1000);
})