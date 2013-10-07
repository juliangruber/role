var net = require('net');
var debug = require('debug')('role');
var seaport = require('seaport');
var reconnect = require('reconnect-net');
var pick = require('./lib/pick');

var roles = {};
var active = process.env.ROLE
  ? process.env.ROLE.split(',')
  : [];
var ports = seaport.createServer();
var host = 'localhost';

// validation
process.nextTick(function () {
  active.forEach(function (name) {
    if (!roles[name]) throw new Error('role ' + name + ' not found.');
  });
});

exports.set = function(name, fn) {
  if (!process.env.ROLE) active.push(name);
  debug('set: %s', name);
  roles[name] = fn;

  if (execLocally(name)) start(name);
};

exports.get = function(name, fn) {
  debug('get: %s', name);

  ports.get(name, function(processes) {
    var ps = pick(processes);
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
      host: host
    }));
  }
}

if (process.env.LISTEN) {
  var port = Number(process.env.LISTEN);

  net.createServer(function (con) {
    debug('new connection');
    con.pipe(ports.createStream()).pipe(con);
  }).listen(port, function () {
    debug('listening on port %s', port);
  });
}

if (process.env.CONNECT) {
  process.env.CONNECT
    .split(',')
    .map(Number)
    .forEach(function(port) {
      reconnect(function (con) {
        debug('connected to port %s', port);
        con.pipe(ports.createStream()).pipe(con);
      }).listen(port);
    });
}

function execLocally (role) {
  return !active.length || active.indexOf(role) > -1;
}

