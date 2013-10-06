module.exports = filterEE;

function filterEE(ee, type, match, fn) {
  ee.on(type, onEvent);
  function onEvent(ev) {
    if (match(ev)) {
      ee.removeListener(type, onEvent);
      fn(ev);
    }
  }
}
