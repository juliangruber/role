/**
 * Module dependencies.
 */

var net = require('net');
var debug = require('debug')('role');
var seaport = require('seaport');
var reconnect = require('reconnect-net');
var host = 'localhost';

/**
 * Module state.
 */

var roles = {};
var active = process.env.ROLE
  ? process.env.ROLE.split(',')
  : [];
var ports = seaport.createServer();

/**
 * Start client or hub.
 */

if (process.env.LISTEN) process.nextTick(listen);
if (process.env.CONNECT) process.nextTick(connect);

/**
 * Validation.
 */

process.nextTick(function () {
  active.forEach(function (name) {
    if (!roles[name]) throw new Error('role ' + name + ' not found.');
  });
});

/**
 * Expose `role`.
 */

module.exports = role;

/**
 * Define role.
 *
 * @param {String} name
 * @param {Function} fn
 */

function role (name, fn) {
  if (!process.env.ROLE) active.push(name);
  debug('set: %s', name);
  roles[name] = fn;

  if (execLocally(name)) start(name);
};

/**
 * Get role.
 *
 * @param {String} name
 * @param {Function} fn
 */

role.get = function (name, fn) {
  debug('get: %s', name);

  ports.get(name, function(processes) {
    var ps = pick(processes);
    fn(net.connect(ps.port, ps.host));
  });
};

/**
 * Start role.
 *
 * @param {String} name
 * @return {Stream}
 */

function start (name) {
  if (name == 'main') {
    roles[name]();
  } else {
    net.createServer(function(con) {
      con.pipe(roles[name]()).pipe(con);
    }).listen(ports.register({ role: name, host: host }));
  }
}

/**
 * Listen on a port.
 */

function listen () {
  //ports.listen(Number(process.env.LISTEN));
  var port = Number(process.env.LISTEN);

  net.createServer(function (con) {
    debug('new connection');
    con.pipe(ports.createStream(host)).pipe(con);
  }).listen(port, function () {
    debug('listening on port %s', port);
  });
}

/**
 * Connect to ports.
 */

function connect () {
  var _ports = process.env.CONNECT.split(',').map(Number);

  _ports.forEach(function(port) {
    reconnect(function (con) {
      debug('client connected to port %s', port);
      con.pipe(ports.createStream(host)).pipe(con);
    }).listen(port);
  });
}

/**
 * Check if role should be executed locally.
 *
 * @param {String} role
 * @return {Boolean}
 */

function execLocally (role) {
  return !active.length || active.indexOf(role) > -1;
}

/**
 * Pick a random element from `arr`.
 *
 * @param {Array} arr
 * @return {Object}
 */

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

