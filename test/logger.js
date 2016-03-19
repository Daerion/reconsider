'use strict'

/* eslint-env node, mocha */

import { expect } from 'chai'

import { getLoggerObject } from '../dist/logger'

function noop () { }

describe('getLoggerObject utility function', function () {
  it('should always return an object with functions for all log levels', function () {
    const levels = [ 'debug', 'verbose', 'info', 'warn', 'error' ]
    const specs = [
      false, // disable logging - will still return an object
      levels.reduce((obj, level) => Object.assign({}, obj, { [level]: noop }), {}), // an object implementing all levels
      { foo: 'bar', debug: noop, info: noop, warn: noop, error: noop } // an object failing to implement "verbose" level - will cause default logger to be used
    ]

    specs.forEach((spec) => {
      const logger = getLoggerObject(spec)

      expect(logger, 'returned logger object').to.have.keys(levels)
    })
  })
})
