module.exports = address;

function address(str) {
  var segs = /^([^\:]+)\:(.+)$/.exec(str);
  return segs
    ? { host: segs[1], port: Number(segs[2]) }
    : { host: 'localhost', port: Number(str) };
}
