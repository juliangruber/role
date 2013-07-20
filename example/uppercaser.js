var role = require('..');
var through = require('through');

role.set('uppercaser', function () {
  return through(function (chunk) {
    this.queue(chunk.toString().toUpperCase());
  });
});

role.set('main', function () {
  role.get('uppercaser', function (upper) {
    process.stdin
      .pipe(through(function (c) { this.queue(c.toString()) }))
      .pipe(upper)
      .pipe(process.stdout);
  });
});
