var Emitter = require('events').EventEmitter;
var MuxDemux = require('mux-demux/msgpack');
var debug = require('debug')('server');
var tmpStream = require('tmp-stream');
var pick = require('./lib/pick');
var filterEE = require('./lib/filter-ee');
var inherits = require('util').inherits;
var Doc = require('crdt').Doc;
var uuid = require('node-uuid').v4;

module.exports = Registry;

function Registry() {
  var self = this;
  if (!(self instanceof Registry)) return new Registry();

  Emitter.call(self);
  self.id = uuid();
  self.doc = new Doc();
  self.set = self.doc.createSet('type', 'service');
  self.remotes = {};

  self.set.on('add', function(row) {
    var service = row.state;
    if (!service.run) {
      service.run = function() {
        var remote = self.remotes[service.remote];
        return remote.createStream({
          id: service.id
        }, { allowHalfOpen: true });
      };
    }
  });
}

inherits(Registry, Emitter);

Registry.prototype.add = function(meta, run) {
  this.doc.add({
    type: 'service',
    meta: meta,
    run: run,
    id: uuid(),
    remote: this.id
  });
};

Registry.prototype.get = function(match, fn) {
  var local = this.set.toJSON();

  for (var i = 0; i < local.length; i++) {
    var service = local[i];
    if (match(service.meta, service)) {
      process.nextTick(function() {
        fn(service.run());
      });
      return;
    }
  }

  filterEE(this.set, 'add', function(row) {
    return match(row.state.meta, row.state);
  }, function(row) {
    fn(row.state.run());
  });
}

Registry.prototype.remove = function(match) {
  var self = this;
  self.set.each(function(service) {
    if (match(service.meta, service)) {
      self.doc.rm(service.id);
    }
  });
}

Registry.prototype.createStream = function() {
  var self = this;
  var mdm = MuxDemux();

  mdm.createWriteStream({ remote: self.id }).end();

  var ds = self.doc.createStream();
  ds.pipe(mdm.createStream('doc')).pipe(ds);

  var remote;

  mdm.on('connection', function(con) {
    if (con.meta.remote) {
      remote = con.meta.remote;
      self.remotes[remote] = mdm;
    } else if (con.meta == 'doc') {
      con.pipe(self.doc.createStream()).pipe(con);
    } else if (con.meta.id) {
      self.get(function(_, service) {
        return service.id == con.meta.id;
      }, function(str) {
        if (str.readable) str.pipe(con);
        if (str.writable) con.pipe(str);
      });
    }
  });

  mdm.on('end', function() {
    if (!id) return;
    self.remove(function(_, _, service) {
      return service.remote == remote;
    });
    delete self.remotes[remote];
  });

  return mdm;
};

