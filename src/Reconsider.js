'use strict'

import deepMerge from 'deepmerge'
import Promise from 'bluebird'

import { getLoggerObject } from './util'

const defaults = require('../defaults.json')

class Reconsider {
  constructor (r, config, logger) {
    this.r = r
    this.config = deepMerge(defaults, config || { })
    this.logger = getLoggerObject(logger)

    this._ops = { }

    if (!this.config.db) {
      throw new Error('No database name set in Reconsider config.')
    }
  }

  get db () {
    return this.r.db(this.config.db)
  }

  init () {
    return this._createDatabase()
      .then(() => this._createMigrationsTable())
  }

  migrateUp () {
    const { logger } = this

    logger.info('↑ Performing database migrations ↑')

    return this.init().then(() => Promise.resolve(this._ops))
  }

  migrateDown () {
    const { logger } = this

    logger.info('↓ Reverting database migrations ↓')

    return Promise.resolve({
      'foo': 2.124156,
      'bar': 5.125,
      'baz': 0.01026
    })
  }

  _createDatabase () {
    const { r, logger, config: { db } } = this

    return r.dbList().run().then((dbs) => {
      if (!dbs.includes(db)) {
        logger.info(`Database ${db} does not exist - creating.`)

        const start = new Date()

        return r.dbCreate(db)
          .then(() => this._registerOp('_create_database', start))
          .then(() => logger.info(`↳ Database ${db} created successfully.`))
      }

      logger.verbose(`⤼ Database ${db} already exists, skipping creation.`)
    })
  }

  _createMigrationsTable () {
    const { logger, config: { migrations: { table: tableName } } } = this

    return this.db.tableList().run().then((tables) => {
      if (!tables.includes(tableName)) {
        logger.info(`Migrations table ${tableName} does not exist - creating.`)

        const start = new Date()

        return this.db.tableCreate(tableName).run()
          .then(() => this._registerOp('_create_migrations_table', start))
          .then(() => logger.info(`↳ Migrations table ${tableName} created successfully.`))
      }

      logger.verbose(`⤼ Migrations table ${tableName} already exists, skipping creation.`)
    })
  }

  _registerOp (id, start) {
    this._ops[id] = (new Date() - start) / 1000
  }
}

export default Reconsider
