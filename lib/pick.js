module.exports = pick;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
