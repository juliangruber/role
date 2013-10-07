var role = require('..');
var through = require('through');

role.set('uppercaser', function() {
  return through(function (chunk) {
    this.queue(chunk.toString().toUpperCase());
  });
});

role.set('main', function() {
  process.stdin.setEncoding('utf8');
  role.get('uppercaser', function (upper) {
    process.stdin
      .pipe(upper)
      .pipe(process.stdout);
  });
});

