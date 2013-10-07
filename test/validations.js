var spawn = require('child_process').spawn;
var test = require('tap').test;
var uppercaser = __dirname + '/../example/uppercaser.js';
var extend = require('xtend');

test('validations', function(t) {
  t.plan(1);

  spawn('node', [uppercaser], {
    env: extend(process.env, {
      ROLE: 'undefined'
    })
  }).stderr.on('data', function(d) {
    console.log(/role undefined not found./.test(d.toString()));
    t.ok(d);
  });
});

