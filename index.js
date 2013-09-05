/**
 * Module dependencies.
 */

var net = require('net');
var EventEmitter = require('events').EventEmitter;
var MuxDemux = require('mux-demux');
var debug = require('debug')('role');
var tmpStream = require('tmp-stream');
var reconnect = require('reconnect-net');
var pick = require('deck').pick;

/**
 * Module state.
 */

var roles = {};
var rolesAvailable = {};
var ee = new EventEmitter;
var mdm;
var active = process.env.ROLE
  ? process.env.ROLE.split(',')
  : [];

/**
 * Start client or hub.
 */

if (process.env.HUB) process.nextTick(hub);
if (process.env.CLIENT) process.nextTick(client);

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

  if (name == 'main' && execLocally('main')) {
    start('main');
  }
};

/**
 * Get role.
 *
 * @param {String} name
 * @param {Function=} fn
 */

role.get = function (name, fn) {
  debug('get: %s', name);

  if (!fn) {
    if (execLocally(name) || rolesAvailable[name]) {
      return start(name);
    } else {
      var tmp = tmpStream();
      ee.once(name, function() {
        tmp.replace(role.get(name));
      });
      return tmp;
    }
  } else {
    if (execLocally(name) || rolesAvailable[name]) {
      fn(start(name));
    } else {
      ee.once(name, function() {
        role.get(name, fn);
      });
    }
  }
};

/**
 * Subscribe role.
 *
 * @param {String} name
 * @param {Function} fn
 */

role.subscribe = function (name, fn) {
  debug('get: %s', name);
  if (execLocally(name)) return fn(start(name));

  var stream;
  if (rolesAvailable[name]) {
    stream = start(name);
    stream.once('end', role.subscribe.bind(null, name, fn));
    fn(stream);
  } else {
    ee.on(name, onConnection);
    function onConnection () {
      if (!stream || stream.destroyed) {
        ee.removeListener(name, onConnection);
        role.subscribe(name, fn);
      }
    }
  }
};

/**
 * Start role.
 *
 * @param {String} name
 * @return {Stream}
 */

function start (name) {
  if (execLocally(name)) {
    debug('start: %s', name);
    var ret = roles[name]();

    // some roles return functions that return streams
    if (typeof ret == 'function') {
      roles[name] = ret;
      return ret();
    } else {
      return ret; 
    }
  } else {
    debug('connect: %s', name);
    return pick(rolesAvailable[name])
      .createStream(name, { allowHalfOpen: true });
  }
}

/**
 * Be a hub.
 */

function hub () {
  var port = Number(process.env.HUB);
  net.createServer(function (con) {
    debug('hub: new connection');
    handleConnection(con);
  }).listen(port, function () {
    debug('hub: listening on port %s', port);
  });
}

/**
 * Be a client.
 */

function client () {
  var port = Number(process.env.CLIENT);
  reconnect(function (con) {
    debug('client connected to port %s', port);
    handleConnection(con);
  }).listen(port);
}

/**
 * Handle hub/client connection.
 *
 * @param {Stream} con
 */

function handleConnection (con) {
  var _roles;
  var mdm = MuxDemux();
  mdm.createWriteStream('me').write(JSON.stringify(active));
  mdm.on('connection', function (stream) {
    if (stream.meta == 'me') {
      stream.on('data', function (data) {
        try { _roles = JSON.parse(data) }
        catch (e) { return console.error(e) }
        _roles.forEach(function (role) {
          debug('new client for role: %s', role);
          if (!rolesAvailable[role]) rolesAvailable[role] = [];
          rolesAvailable[role].push(mdm);
          ee.emit(role, mdm);
        });
      });
      return;
    }

    if (!roles[stream.meta]) {
      debug('unknown role: %s', stream.meta);
      stream.end();
      return;
    }

    var str = start(stream.meta);
    if (str.readable) str.pipe(stream);
    if (str.writable) stream.pipe(str);
  });
  con.on('end', function () {
    if (_roles) {
      _roles.forEach(function (name) {
        rolesAvailable[name].splice(rolesAvailable[name].indexOf(mdm), 1);
        if (!rolesAvailable[name].length) delete rolesAvailable[name];
      });
    }
  });
  con.pipe(mdm).pipe(con);
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
