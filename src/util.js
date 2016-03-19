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
    const log = console.log.bind(console)

    return {
      log,
      debug: log,
      verbose: log,
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    }
  }

  return providedLogger
}
