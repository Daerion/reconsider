'use strict'

/* eslint-env node, mocha */

import { expect } from 'chai'
import path from 'path'

import r, { dbName } from './util/db'
import Reconsider from '../dist/Reconsider'

const migrationsDir = path.resolve(__dirname, 'util/migrations')

function getReconsiderObject () {
  return new Reconsider(r, { db: dbName, migrations: { dir: migrationsDir } })
}

describe('Reconsider class', function () {
  it('should require a valid driver object and a database name', function () {
    expect(() => new Reconsider(r), 'constructor without dbname').to.throw()
    expect(() => new Reconsider(null, { db: 'foo' }), 'constructor without driver object').to.throw()
    expect(() => new Reconsider(() => 'foo', { db: 'foo' }), 'constructor with invalid driver object').to.throw()
  })

  it('should automatically create a database and a migrations table', async function () {
    this.timeout(0)

    const tempDb = 'foo123'
    const recon = new Reconsider(r, { db: tempDb })

    await recon._createDatabase()

    const dbs = await r.dbList().run()

    expect(dbs, 'list of databases').to.include(tempDb)

    await recon._createMigrationsTable()

    const tables = await r.db(tempDb).tableList().run()

    expect(tables, `list of tables in ${tempDb}`).to.include(recon.config.migrations.table)

    await r.dbDrop(tempDb)
  })

  it('should return a list of migrations', async function () {
    this.timeout(0)

    const recon = getReconsiderObject()

    await recon._init()
    await recon.migrationsTable.insert({ id: '04-completed', completed: new Date() }).run()

    const migrations = await recon.getMigrations()

    expect(migrations, 'list of migrations').to.be.an('array')

    const ids = migrations.map(({ id }) => id)

    expect(ids, 'list of migration ids').to.have.members([ '01-create-tables', '03-insert-data' ])
    expect(ids, 'list of migration ids').to.not.include.members([ '02-invalid', '04-completed' ])

    // @todo Test for other param combinations
  })

  it('should be able to run migrations', async function () {
    this.timeout(0)

    const createdTables = [ 'foo', 'bar', 'baz', 'more', 'tables' ]
    const recon = getReconsiderObject()

    await recon.migrateUp()

    expect(await r.tableList().run(), 'list of tables').to.include.members(createdTables)
    expect(await r.table('foo').count().run(), 'rows in table "foo"').to.equal(3)
    expect(await r.table('bar').count().run(), 'rows in table "bar"').to.equal(6)
    expect(await r.table('baz').count().run(), 'rows in table "baz"').to.equal(3)

    await recon.migrateDown()

    expect(await r.tableList().run(), 'list of tables').to.not.include.members(createdTables)
  })
})
