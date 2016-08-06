'use strict'

/* eslint-env node, mocha */

import crypto from 'crypto'
import { expect } from 'chai'
import path from 'path'

import getConnection, { dbName } from './util/db'
import Reconsider from '../dist'

const migrationsDir = path.resolve(__dirname, 'util/migrations')

function getReconsiderObject () {
  return new Reconsider(getConnection(), { db: dbName, sourceDir: migrationsDir })
}

describe('Reconsider class', function () {
  it('should require a valid driver object and a database name', function () {
    expect(() => new Reconsider(getConnection()), 'constructor without dbname').to.throw()
    expect(() => new Reconsider(null, { db: 'foo' }), 'constructor without driver object').to.throw()
    expect(() => new Reconsider(() => 'foo', { db: 'foo' }), 'constructor with invalid driver object').to.throw()
  })

  it('should automatically create a database and a migrations table', async function () {
    this.timeout(0)

    const tempDb = `tmp_${crypto.randomBytes(6).toString('hex')}`
    const recon = new Reconsider(getConnection({ db: tempDb }), { db: tempDb })
    const r = recon.r

    await recon._createDatabase()

    const dbs = await r.dbList().run()

    expect(dbs, 'list of databases').to.include(tempDb)

    await recon._createMigrationsTable()

    const tables = await r.db(tempDb).tableList().run()

    expect(tables, `list of tables in ${tempDb}`).to.include(recon.config.tableName)

    await r.dbDrop(tempDb)
  })

  it('should return a list of migrations', async function () {
    this.timeout(0)

    const recon = getReconsiderObject()

    await recon._init()
    // Fake completion of "05-completed"
    await recon.migrationsTable.insert([
      { id: '05-completed', completed: new Date() }
    ]).run()

    const migrations = await recon.getMigrations(true, false, [ '04-faulty' ])

    expect(migrations, 'list of migrations').to.be.an('array')

    const ids = migrations.map(({ id }) => id)

    expect(ids, 'list of migration ids').to.have.members([ '01-create-tables', '03-insert-data', '06-more-tables' ])
    expect(ids, 'list of migration ids').to.not.include.members([ '02-invalid', '04-faulty', '05-completed' ])

    // @todo Test for other param combinations

    await recon.migrationsTable.get('05-completed').delete().run()
  })

  it('should be able to run migrations', async function () {
    this.timeout(0)

    const createdTables = [ 'foo', 'bar', 'baz', 'more', 'tables' ]
    const recon = getReconsiderObject()
    const r = recon.r

    await recon.migrateUp([ '04-faulty' ]) // exclude "faulty" migration used in another test

    expect(await r.tableList().run(), 'list of tables').to.include.members(createdTables)
    expect(await r.table('foo').count().run(), 'rows in table "foo"').to.equal(3)
    expect(await r.table('bar').count().run(), 'rows in table "bar"').to.equal(6)
    expect(await r.table('baz').count().run(), 'rows in table "baz"').to.equal(3)

    await recon.migrateDown()

    expect(await r.tableList().run(), 'list of tables').to.not.include.members(createdTables)
  })

  it('should run migrations until an error is encountered', async function () {
    this.timeout(0)

    const createdTables = [ 'foo', 'bar', 'baz' ]
    const dontCreate = [ 'more', 'tables' ]
    const recon = getReconsiderObject()
    const r = recon.r

    try {
      await recon.migrateUp()
    } catch (e) {
      // migration "04-faulty" will throw - all other migrations should have been run regardless
    }

    const tableList = await r.tableList().run()

    expect(tableList, 'list of tables').to.include.members(createdTables)
    expect(tableList, 'list of tables').to.not.include.members(dontCreate)
    expect(await r.table('foo').count().run(), 'rows in table "foo"').to.equal(3)
    expect(await r.table('bar').count().run(), 'rows in table "bar"').to.equal(6)
    expect(await r.table('baz').count().run(), 'rows in table "baz"').to.equal(3)

    await recon.migrateDown()

    expect(await r.tableList().run(), 'list of tables').to.not.include.members(createdTables)
  })
})
