var role = require('..');
var through = require('through');

role('uppercaser', function () {
  return through(function (chunk) {
    this.queue(chunk.toString().toUpperCase());
  });
});

role('main', function () {
  role.subscribe('uppercaser', function (upper) {
    process.stdin.setEncoding('utf8');
    process.stdin
      .pipe(upper)
      .pipe(process.stdout);
  });
});
