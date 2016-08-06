'use strict'

/* eslint-env mocha */

import { expect } from 'chai'
import Promise from 'bluebird'

import getConnection from './util/db'
import { helpers } from '../dist'
import { getLoggerObject } from '../dist/logger'

describe('database migration utilities', function () {
  const noop = function () { }
  const logger = getLoggerObject()

  describe('basic functionality', function () {
    const { createMigration } = helpers

    it('should only accept functions as parameters', function () {
      expect(() => createMigration()).to.throw()
      expect(() => createMigration('foo', 'bar')).to.throw()
      expect(() => createMigration(noop, 'bar')).to.throw()
      expect(() => createMigration(noop, noop)).to.not.throw()
    })

    it('should return an object containing up and down function properties', function () {
      const migration = createMigration(noop, noop)

      expect(migration).to.have.all.keys([ 'up', 'down' ])
      expect(migration.up).to.be.a('function')
      expect(migration.down).to.be.a('function')
    })
  })

  describe('"tables" migration', function () {
    const { createTablesMigration } = helpers
    const r = getConnection()
    const testTables = [ 'foo', 'bar' ]
    const migration = createTablesMigration(testTables)

    const dropTestTables = async () => {
      const existingTables = await r.tableList().run()

      return await Promise.each(existingTables.filter((table) => testTables.includes(table)), (table) => r.tableDrop(table).run())
    }

    after(dropTestTables)

    it('should require a non-empty list of tables', function () {
      expect(() => createTablesMigration()).to.throw()
      expect(() => createTablesMigration([])).to.throw()
      expect(() => createTablesMigration([ 'foo' ])).to.not.throw()
    })

    it('should create specified tables', async function () {
      await migration.up(r, logger)

      const existingTables = await r.tableList().run()

      expect(existingTables).to.include.members(testTables)
    })

    it('should remove specified tables', async function () {
      let existingTables = await r.tableList().run()

      await Promise.each(testTables.filter((table) => !existingTables.includes(table)), (table) => r.tableCreate(table).run())

      await migration.down(r, logger)

      existingTables = await r.tableList().run()

      expect(existingTables).to.not.include.members(testTables)
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
