'use strict';

/* eslint-disable @typescript-eslint/no-require-imports */
const patched = require('brace-expansion-v5');

// brace-expansion 1.x/2.x exported the expansion function directly. Modern
// releases expose a named `expand` export. Preserve both forms so older
// minimatch callers can use the patched implementation without an API break.
module.exports = patched.expand;
module.exports.expand = patched.expand;
module.exports.EXPANSION_MAX = patched.EXPANSION_MAX;
module.exports.EXPANSION_MAX_LENGTH = patched.EXPANSION_MAX_LENGTH;
