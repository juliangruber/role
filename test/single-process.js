var spawn = require('child_process').spawn;
var test = require('tap').test;

test('single process', function(t) {
  t.plan(1);

  var ps = spawn('node', [__dirname + '/../example/uppercaser.js']);

  ps.stdout.on('data', function(d) {
    t.equal(d.toString(), 'FOO');
    ps.kill();
  });

  ps.stdin.write('foo');
});

