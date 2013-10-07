var net = require('net');
var debug = require('debug')('role');
var seaport = require('seaport');
var reconnect = require('reconnect-net');
var pick = require('./lib/pick');

var roles = {};
var active = process.env.ROLE
  ? process.env.ROLE.split(',')
  : [];
var ports;

if (process.env.CONNECT) {
  ports = seaport.connect(process.env.CONNECT);
} else {
  ports = seaport.createServer();

  if (process.env.LISTEN) {
    ports.listen(Number(process.env.LISTEN));

    if (process.env.PEER) {
      process.env.PEER
      .split(',')
      .forEach(function(addr) {
        ports.peer(addr);
      });
    }
  }
}

// validation
process.nextTick(function () {
  active.forEach(function (name) {
    if (!roles[name]) throw new Error('role ' + name + ' not found.');
  });
});

exports.set = function(name, fn) {
  debug('set: %s', name);
  if (!process.env.ROLE) active.push(name);
  roles[name] = fn;

  if (execLocally(name)) start(name);
};

exports.get = function(name, fn) {
  debug('get: %s', name);

  ports.get(name, function(processes) {
    var ps = pick(processes);
    debug('got: %s (%s:%s)', name, ps.host, ps.port);
    fn(net.connect(ps.port, ps.host));
  });
};

function start (name) {
  if (name == 'main') {
    roles[name]();
  } else {
    net.createServer(function(con) {
      con.pipe(roles[name]()).pipe(con);
    }).listen(ports.register({
      role: name,
      host: 'localhost'
    }));
  }
}

function execLocally (role) {
  return !active.length || active.indexOf(role) > -1;
}

