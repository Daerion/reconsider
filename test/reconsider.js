'use strict'

/* eslint-env node, mocha */

import { expect } from 'chai'
import path from 'path'

import r, { dbName } from './util/db'
import Reconsider from '../dist/Reconsider'

function getReconsiderObject () {
  return new Reconsider(r, { db: dbName, migrations: { dir: path.resolve(__dirname, 'util/migrations') } })
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
    await recon.migrationsTable.insert({ id: '04-completed', completed: '2016-03-03T13:15:49.889Z' }).run()

    const migrations = await recon.getMigrations()

    expect(migrations, 'list of migrations').to.be.an('array')

    const ids = migrations.map(({ id }) => id)

    expect(ids, 'list of migration ids').to.have.members([ '01-create-tables', '03-insert-data' ])
    expect(ids, 'list of migration ids').to.not.have.members([ '02-invalid', '04-completed' ])

    // @todo Test for other param combinations
  })

  it('should run ')
})
