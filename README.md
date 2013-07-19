
# role

Develop services as single processes, deploy them as multiple.

## Usage

Let's write a webserver that stores and receives data from a leveldb, and
operates on querystrings. Since we want to be able to split up the http
server and the leveldb later, we give each a role:

```js
var role = require('role');
var level = require('level');
var multilevel = require('multilevel');
var http = require('http');
var qs = require('querystring');

// we define the `db` role
role.set('db', function () {
  var db = level(__dirname + '/db');
  return function () {
    return multilevel.server(db);
  }
});

// we define the `main` role
role.set('main', function () {
  var db = multilevel.client();

  // we request the `db` role
  role.get('db', function (s) {
    s.pipe(db.createRpcStream()).pipe(s);
  });

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
  }).listen(8000, function () {
    console.log('~> localhost:8000');
  });
});
```

*`main` is a special role which will always be executed immediately. All the
other rules will be executed when requested via `role.get()`.*

Now, to start as a single process:

```bash
$ node example/simple.js
$ open http://localhost:8000/
```

To start as two seperate processes:

```bash
$ HUB=7888 ROLE=main node example/simple.js 
$ CLIENT=7888 ROLE=db node example/simple.js 
```

To start as three seperate processes (mind synchronisation):

```bash
$ HUB=7888 ROLE=main node example/simple.js 
$ CLIENT=7888 ROLE=db node example/simple.js 
$ CLIENT=7888 ROLE=db node example/simple.js 
$ # Now you can just kill and recreate one database at a time and the site
will stay up.
```

When using distributed/production mode you just have to make sure that there's
always have at least one hub running.

## API

### role.get(name, fn)

Call `fn` with a stream for role `name`. When the connection is lost and a new
one is made or already available, call `fn` again.

### role.set(name, fn)

Set `fn` to be role `name`. `fn` should return a **Stream** or a **Function**
that returns a Stream.

## Env flags

Pass none for local mode. Pass `HUB` and `ROLE` or `CLIENT` and `ROLE` for
distributed/production mode.

* `HUB`: Be a hub and listen on that port.
* `CLIENT`: Be a client and listen on that port.
* `ROLE`: The role to serve. Multiple roles are activated when you pass a comma-seperated list, like `main,db`.

## Installation

With [npm](http://npmjs.org) do

```bash
$ npm install role
```

## License

Copyright (c) 2013 Julian Gruber &lt;julian@juliangruber.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
