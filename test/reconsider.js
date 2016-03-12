'use strict'

/* eslint-env node, mocha */

import { expect } from 'chai'

import r from './util/db'
import Reconsider from '../dist/Reconsider'

describe('Reconsider class', function () {
  it('should require a valid driver object and a database name', function () {
    expect(() => new Reconsider(r), 'constructor without dbname').to.throw()
    expect(() => new Reconsider(null, { db: 'foo' }), 'constructor without driver object').to.throw()
    expect(() => new Reconsider(() => 'foo', { db: 'foo' }), 'constructor with invalid driver object').to.throw()
  })
})
