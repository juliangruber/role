var net = require('net');
var debug = require('debug')('role');
var pick = require('./lib/pick');
var createSeaport = require('./lib/create-seaport');
var noop = function(){};

var roles = {};
var active = process.env.ROLE
  ? process.env.ROLE.split(',')
  : [];
var ports = createSeaport();

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

  if (!active.length || active.indexOf(name) > -1) {
    start(name);
  }
};

exports.get = function(name, fn) {
  debug('get: %s', name);

  ports.get(name, function(processes) {
    var ps = pick(processes);
    debug('got: %s (%s:%s)', name, ps.host, ps.port);
    fn(net.connect(ps.port, ps.host));
  });
};

exports.subscribe = function(name, fn) {
  exports.get(name, function(con) {
    var onend = exports.subscribe.bind(null, name, fn);
    con.on('end', onend);
    con.on('error', onend);

    fn(con);
  });
};

function start (name) {
  if (name == 'main') {
    roles[name]();
  } else {
    net.createServer(function(con) {
      con.on('error', noop);
      con.pipe(roles[name]()).pipe(con);
    }).listen(ports.register({
      role: name,
      host: 'localhost'
    }));
  }
}

