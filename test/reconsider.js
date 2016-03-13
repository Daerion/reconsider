'use strict'

/* eslint-env node, mocha */

import { expect } from 'chai'
import path from 'path'

import r, { dbName } from './util/db'
import Reconsider from '../dist/Reconsider'

describe('Reconsider class', function () {
  it('should require a valid driver object and a database name', function () {
    expect(() => new Reconsider(r), 'constructor without dbname').to.throw()
    expect(() => new Reconsider(null, { db: 'foo' }), 'constructor without driver object').to.throw()
    expect(() => new Reconsider(() => 'foo', { db: 'foo' }), 'constructor with invalid driver object').to.throw()
  })

  it('should return a list of migrations', async function () {
    this.timeout(0)

    const recon = new Reconsider(r, { db: dbName, migrations: { dir: path.resolve(__dirname, 'util/migrations') } })

    await recon._init()
    await recon.migrationsTable.insert({id: '04-completed', completed: '2016-03-03T13:15:49.889Z'})

    const migrations = await recon.getMigrations()

    expect(migrations, 'list of migrations').to.be.an('array')

    const ids = migrations.map(({id}) => id)
    console.dir(ids)

    expect(ids, 'list of migration ids').to.have.members(['01-create-tables', '03-insert-data'])
    expect(ids, 'list of migration ids').to.not.have.members(['02-invalid', '04-completed'])
  })
})
