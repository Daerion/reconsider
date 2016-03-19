'use strict'

function noop () { }

/**
 * Retrieves the logger object used by Reconsider
 *
 * If a suitable logger object, i.e. one with functions for all log levels, is provided, then that object will be
 * returned. If "false" is provided instead, an object containing a noop function for each level will be returned
 * (i.e. logging will be disabled entirely). Otherwise a default logger implementation using the various console
 * methods will be returned.
 * The default implementation will use noop functions for all levels below the minium level specified. Setting a
 * minimum log level when providing a custom logger implementation will have no effect.
 *
 * @param {(object|false)} [providedLogger] - Logger
 * @param {string} [minLevel] - Minimum log level, used only in combination with a default logger implementation
 * @returns {object}
 */
export function getLoggerObject (providedLogger, minLevel = 'info') {
  if (providedLogger === false) {
    return {
      debug: noop,
      verbose: noop,
      info: noop,
      warn: noop,
      error: noop
    }
  }

  const levels = [ 'debug', 'verbose', 'info', 'warn', 'error' ]
  let loggerUsable = null

  if (providedLogger) {
    loggerUsable = levels.reduce((isUsable, level) => isUsable && typeof providedLogger[level] === 'function', true)

    if (loggerUsable) {
      return providedLogger
    }
  }

  const minLevelIndex = levels.indexOf(minLevel)

  let logger = { }

  levels.forEach((level, index) => {
    let fn

    if (index < minLevelIndex) {
      fn = noop
    } else {
      const sourceFn = console[level] || console.log

      fn = (msg) => sourceFn.call(sourceFn, `[${level}] ${msg}`)
    }

    logger[level] = fn
  })

  if (providedLogger && !loggerUsable) {
    logger.warn(`× Provided logger objects must implement a function for each log level (${levels.join(', ')}). To disable logging set the "logger" parameter to false. Will log to console instead.`)
  }

  return logger
}
