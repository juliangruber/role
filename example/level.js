var role = require('..');
var level = require('level');
var multilevel = require('multilevel');
var _db;

role.set('db', function() {
  if (!_db) _db = level(__dirname + '/db');
  return multilevel.server(_db);
});

role.set('main', function() {
  var db = multilevel.client();
  role.subscribe('db', function(con) {
    con.pipe(db.createRpcStream()).pipe(con);
  });

  db.put('foo', 'bar', function(err) {
    if (err) throw err;
    process.stdout.write('put');
  });

  process.stdin.once('data', function() {
    db.get('foo', function(err, value) {
      if (err) throw err;
      process.stdout.write(value);
    });
  });
});

