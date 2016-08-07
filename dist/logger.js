'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLoggerObject = getLoggerObject;
function noop() {}

function getLoggerObject(providedLogger) {
  var minLevel = arguments.length <= 1 || arguments[1] === undefined ? 'info' : arguments[1];

  if (providedLogger === false) {
    return {
      debug: noop,
      verbose: noop,
      info: noop,
      warn: noop,
      error: noop
    };
  }

  var levels = ['debug', 'verbose', 'info', 'warn', 'error'];
  var loggerUsable = null;

  if (providedLogger) {
    loggerUsable = levels.reduce(function (isUsable, level) {
      return isUsable && typeof providedLogger[level] === 'function';
    }, true);

    if (loggerUsable) {
      return providedLogger;
    }
  }

  var minLevelIndex = levels.indexOf(minLevel);

  var logger = {};

  levels.forEach(function (level, index) {
    var fn = void 0;

    if (index < minLevelIndex) {
      fn = noop;
    } else {
      (function () {
        var sourceFn = console[level] || console.log;

        fn = function fn(msg) {
          return sourceFn.call(sourceFn, '[' + level + '] ' + msg);
        };
      })();
    }

    logger[level] = fn;
  });

  if (providedLogger && !loggerUsable) {
    logger.warn('× Provided logger objects must implement a function for each log level (' + levels.join(', ') + '). To disable logging set the "logger" parameter to false. Will log to console instead.');
  }

  return logger;
}