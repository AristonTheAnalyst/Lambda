// Polyfill crypto.randomUUID for the Jest/Node environment
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  const { randomUUID } = require('crypto');
  global.crypto = { randomUUID };
}
