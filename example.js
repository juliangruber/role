var Registry = require('./');

var a = Registry();

a.add('stdin', function() {
  process.stdin.resume();
  return process.stdin;
});

var b = Registry();

b.add('stdout', function() {
  return process.stdout;
});

var as = a.createStream();
as.pipe(b.createStream()).pipe(as);

b.get(function(n) { return n == 'stdin' }, function(stdin) {
  a.get(function(n) { return n == 'stdout' }, function(stdout) {
    stdin.pipe(stdout);
  });
});
