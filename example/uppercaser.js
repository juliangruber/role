var role = require('..');
var through = require('through');

role('uppercaser', function () {
  return through(function (chunk) {
    this.queue(chunk.toString().toUpperCase());
  });
});

role('main', function () {
  role.get('uppercaser', function (upper) {
    process.stdin
      .pipe(through(function (c) { this.queue(c.toString()) }))
      .pipe(upper)
      .pipe(process.stdout);
  });
});