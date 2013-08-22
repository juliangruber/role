
# role

Develop services as single processes, deploy them as multiple - from a single
code base.

Each service is a `role` and exports a stream, as every good networker does.
Then cluster / distributed roles as you wish.

Network partitions / reconnects are handled transparently.

## Example: Subscribe to role

Let's write a CLI app that uppercases `stdin`. Because in production we'll want
to use multiple processes and especially split up uppercasing from the
frontend, we use a role for each:

```js
var role = require('role');
var through = require('through');

role('uppercaser', function () {
  return through(function (chunk) {
    this.queue(chunk.toString().toUpperCase());
  });
});

role('main', function () {
  role.subscribe('uppercaser', function (upper) {
    process.stdin
      .pipe(through(function (c) { this.queue(c.toString()) }))
      .pipe(upper)
      .pipe(process.stdout);
  });
});
```

*`main` is a special role which will always be executed immediately. All the
other rules will be executed when requested via `role.get()`.*

Now, to start as a single process:

```bash
$ node example/uppercaser.js
hi
HI
what's up
WHAT'S UP
```

To start as two seperate processes, one being the uppercaser (read: doing
something cpu intensive), the other being being the frontend:

```bash
$ HUB=7888 ROLE=main node example/uppercaser.js 
$ CLIENT=7888 ROLE=uppercaser node example/uppercaser.js 
```

To start as three seperate processes:

```bash
$ HUB=7888 ROLE=main node example/uppercaser.js 
$ CLIENT=7888 ROLE=uppercaser node example/uppercaser.js 
$ CLIENT=7888 ROLE=uppercaser node example/uppercaser.js 
$ # you can kill any client without causing downtime
```

When using distributed / production mode just make sure that
there's always at least one hub running.

## Example: Get role

When you only need a stream once, `role.get(name)` returns a stream that you can use immediately and buffers if necessary:

```js
var role = require('..');
var through = require('through');

role('uppercaser', function () {
  return through(function (chunk) {
    this.queue(chunk.toString().toUpperCase());
  });
});

role('main', function () {
  process.stdin.setEncoding('utf8');
  process.stdin
    .pipe(role.get('uppercaser'))
    .pipe(process.stdout);
});
```

## API

### role(name, fn)

Set `fn` to be role `name`. `fn` should return a **Stream** or a **Function**
that returns a Stream.

### role.get(name)

Return a Stream that can be used immediately and if necessary buffers until the connection is made.

### role.subscribe(name, fn)

Call `fn` with a stream for role `name`. When the connection is lost and a new
one is made or already available, call `fn` again.

## Env flags

Pass none for local mode. Pass `HUB` and `ROLE` or `CLIENT` and `ROLE` for
distributed/production mode.

* `HUB`: Be a hub and listen on that port.
* `CLIENT`: Be a client and listen on that port.
* `ROLE`: The role to serve. Multiple roles are activated when you pass a comma-seperated list, like `main,db`.

## Debugging

Pass `DEBUG=role` to see what's going on:

![debug](http://i.cloudup.com/Ar8aXJj6ia.png)

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