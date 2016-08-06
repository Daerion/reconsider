'use strict'

/* eslint-env mocha */

import { expect } from 'chai'

// import getConnection from './util/db'
import { helpers } from '../dist'

describe('database migration utilities', function () {
  const noop = function () { }

  describe('basic functionality', function () {
    const { createMigration } = helpers

    it.skip('should only accept functions as parameters', function () {
      expect(() => createMigration()).to.throw()
      expect(() => createMigration('foo', 'bar')).to.throw()
      expect(() => createMigration(noop, 'bar')).to.throw()
      expect(() => createMigration(noop, noop)).to.not.throw()
    })

    it.skip('should return an object containing up and down function properties', function () {
      const migration = createMigration(noop, noop)

      expect(migration).to.have.properties([ 'up', 'down' ])
      expect(migration.up).to.be.a('function')
      expect(migration.down).to.be.a('function')
    })
  })

  describe('"tables" migration', function () {
    const { createTablesMigration } = helpers

    it.skip('should require a non-empty list of tables', function () {
      expect(() => createTablesMigration()).to.throw()
      expect(() => createTablesMigration([])).to.throw()
      expect(() => createTablesMigration([ 'foo' ])).to.not.throw()
    })

    it.skip('should create specified tables', async function () {

    })

    it.skip('should remove specified tables', async function () {

    })
  })

  describe('"index" migration', function () {
    it.skip('should require a non-empty list of indices', function () {

    })

    it.skip('should create specified indices', async function () {

    })

    it.skip('should remove specified indices', async function () {

    })
  })
})
