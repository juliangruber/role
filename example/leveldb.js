var role = require('..');
var level = require('level-test')({ mem: true });
var multilevel = require('multilevel');
var http = require('http');
var qs = require('querystring');

role('db', function () {
  var db = level();
  return function () {
    return multilevel.server(db);
  }
});

role('main', function () {
  var db = multilevel.client();
  role.subscribe('db', function (s) {
    s.pipe(db.createRpcStream()).pipe(s);
  });

  var port = process.env.PORT
    ? Number(process.env.PORT)
    : 8000;

  http.createServer(function (req, res) {
    var query = qs.parse(req.url.split('?').slice(1).join(''));
    if (query.get) {
      db.get(query.get, function (err, val) {
        if (err) res.end('not found');
        else res.end(val);
      });
    } else if (query.put) {
      db.put(query.put, query.value, function (err) {
        if (err) res.end(String(err));
        else res.end('ok');
      });
    } else {
      res.end('try\n\n/?put=foo&value=bar\n\n/?get=foo');
    }
  }).listen(port, function () {
    console.log('~> localhost:%s', port);
  });
});
