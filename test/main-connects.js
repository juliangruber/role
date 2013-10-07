var spawn = require('child_process').spawn;
var test = require('tap').test;
var uppercaser = __dirname + '/../example/uppercaser.js';
var extend = require('xtend');

test('main connects', function(t) {
  t.plan(1);

  var upper = spawn('node', [uppercaser], {
    env: extend(process.env, {
      LISTEN: '8900',
      ROLE: 'uppercaser'
    })
  });
  var main = spawn('node', [uppercaser], {
    env: extend(process.env, {
      LISTEN: '8901',
      PEER: '8900',
      ROLE: 'main'
    })
  });

  upper.stderr.pipe(process.stderr, { end: false });
  main.stderr.pipe(process.stderr, { end: false });

  main.stdout.on('data', function(d) {
    t.equal(d.toString(), 'FOO');
    upper.kill();
    main.kill();
  });

  main.stdin.write('foo');
});

