/** Shared Socket.IO instance so HTTP handlers can broadcast admin events. */
let io = null;

function setIo(instance) {
  io = instance;
}

function getIo() {
  return io;
}

module.exports = { setIo, getIo };
