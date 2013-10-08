var seaport = require('seaport');

module.exports = createSeaport;

function createSeaport() {
  if (process.env.CONNECT) {
    return seaport.connect(process.env.CONNECT);
  } else {
    var ports = seaport.createServer();

    if (process.env.LISTEN) {
      ports.listen(Number(process.env.LISTEN));

      if (process.env.PEER) {
        process.env.PEER.split(',').forEach(ports.peer);
      }
    }
    return ports;
  }
}

