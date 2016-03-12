'use strict'

function noop () { }

export function getLoggerObject (providedLogger) {
  if (providedLogger === false) {
    return {
      log: noop,
      debug: noop,
      verbose: noop,
      info: noop,
      warn: noop,
      error: noop
    }
  }

  if (!providedLogger) {
    return {
      log: console.log.bind(console),
      debug: console.log.bind(console),
      verbose: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    }
  }

  return providedLogger
}
