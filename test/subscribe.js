var spawn = require('child_process').spawn;
var test = require('tap').test;
var level = __dirname + '/../example/level.js';
var extend = require('xtend');

test('subscribe', function(t) {
  t.plan(2);

  function spawnDB() {
    var ps = spawn('node', [level], {
      env: extend(process.env, {
        CONNECT: '8900',
        ROLE: 'db'
      })
    });
    ps.stderr.pipe(process.stderr, { end: false });
    return ps;
  }

  function spawnMain() {
    var ps = spawn('node', [level], {
      env: extend(process.env, {
        LISTEN: '8900',
        ROLE: 'main'
      })
    });
    ps.stderr.pipe(process.stderr, { end: false });
    return ps;
  }

  var db = spawnDB();
  var main = spawnMain();

  main.stdout.once('data', function(d) {
    t.equal(d.toString(), 'put');

    db.kill();
    db = spawnDB();

    setTimeout(function() {
      main.stdin.write('next');
    }, 600);

    main.stdout.once('data', function(d) {
      t.equal(d.toString(), 'bar');
      db.kill();
      main.kill();
    });
  });
});

