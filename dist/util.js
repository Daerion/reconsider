'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLoggerObject = getLoggerObject;
function noop() {}

function getLoggerObject(providedLogger) {
  if (providedLogger === false) {
    return {
      log: noop,
      debug: noop,
      verbose: noop,
      info: noop,
      warn: noop,
      error: noop
    };
  }

  if (!providedLogger) {
    var log = console.log.bind(console);

    return {
      log: log,
      debug: log,
      verbose: log,
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };
  }

  return providedLogger;
}