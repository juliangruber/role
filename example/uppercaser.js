var role = require('..');
var through = require('through');

role('uppercaser', function () {
  return through(function (chunk) {
    this.queue(chunk.toString().toUpperCase());
  });
});

role('main', function () {
  process.stdin.setEncoding('utf8');
  role.subscribe('uppercaser', function (upper) {
    process.stdin
      .pipe(upper)
      .pipe(process.stdout);
  });
});
