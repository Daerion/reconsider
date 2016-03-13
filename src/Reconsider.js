'use strict'

import deepMerge from 'deepmerge'
import fs from 'fs'
import path from 'path'
import Promise from 'bluebird'

const readDirAsync = Promise.promisify(fs.readdir)

import { getLoggerObject } from './util'

const defaults = require('../defaults.json')

const FUNC_NAME_UP = 'up'
const FUNC_NAME_DOWN = 'down'

class Reconsider {
  constructor (r, config, logger) {
    this.r = r
    this.config = deepMerge(defaults, config || { })
    this.logger = getLoggerObject(logger)

    this._ops = { }

    if (!this.r || typeof this.r !== 'function' || typeof this.r.db !== 'function') {
      throw new Error('No or invalid database driver object passed to Reconsider constructor.')
    }

    if (!this.config.db) {
      throw new Error('No database name set in Reconsider config.')
    }
  }

  get db () {
    return this.r.db(this.config.db)
  }

  get migrationsTable () {
    return this.db.table(this.config.migrations.table)
  }

  migrateUp () {
    const { logger } = this

    logger.info('↑ Performing database migrations ↑')

    return this._init()
      .then(() => this.getMigrations())
      .then((migrations) => this._runMigrationFunctions(migrations, FUNC_NAME_UP))
      .then((completionInfo) => this.migrationsTable.insert(completionInfo).run())
      .then(() => this._ops)
  }

  migrateDown () {
    const { logger } = this

    logger.info('↓ Reverting database migrations ↓')

    return this._init()
      .then(() => this.getMigrations(false, true))
      .then((migrations) => this._runMigrationFunctions(migrations, FUNC_NAME_DOWN))
      .then((completionInfo) => completionInfo.map(({id}) => id))
      .then((revertedIds) => this.migrationsTable.getAll(this.r.args(revertedIds)).delete().run())
      .then(() => this._ops)
  }

  getMigrations (pending = true, completed = false) {
    const { logger, config: { migrations: { dir } } } = this

    logger.debug(`Reading list of migrations from directory ${dir}.`)

    if (!pending && !completed) { // Someone *will* eventually do this
      throw new Error('Retreiving neither pending nor completed migrations is nonsensical.')
    }

    let infoObjects

    if (!pending && completed) { // Retrieve only completed migrations (i.e. only those stored in the info table)
      infoObjects = this.migrationsTable.run()
    } else {
      infoObjects = readDirAsync(dir)
        // Filter out all non .js files
        .then((files) => files.filter((file) => file.endsWith('.js')))
        // Cut off filename extension so only the IDs remain
        .then((jsFiles) => jsFiles.map((file) => file.substr(0, file.lastIndexOf('.js'))))
        .then((migrationIds) => {
          // Retrieve a list of all completed migrations
          return this.migrationsTable.run().then((completedMigrations) => {
            // Return an array of migration info objects - using data retrieved from the table if available, and an
            // object with it's "completed" property set to false for pending ones
            return migrationIds.map((id) => completedMigrations.find((el) => el.id === id) || { id, completed: false })
          })
        })
        // Unless we're including completed migrations too, return only those with their "completed" property set to false
        .then((migrationInfo) => !completed ? migrationInfo.filter(({ completed }) => completed === false) : migrationInfo)
    }

    return infoObjects
      // Require each file and see if it exports an "up" and a "down" function
      .then((info) => info.map(this.getMigration.bind(this)))
      // Filter out all invalid migrations
      .then((migrations) => migrations.filter((m) => !!m))
  }

  getMigration (info) {
    const { logger, config: { migrations: { dir } } } = this
    const filepath = path.resolve(dir, `${info.id}.js`)

    logger.debug(`Attempting to require('${filepath}')`)

    try {
      const m = require(filepath)
      const up = m[FUNC_NAME_UP]
      const down = m[FUNC_NAME_DOWN]

      if (typeof up !== 'function' || typeof down !== 'function') {
        logger.warn(`× Cannot include migration "${info.id}": migration files must export an "${FUNC_NAME_UP}" and a "${FUNC_NAME_DOWN}" function.`)

        return false
      }

      return Object.assign({}, info, { up, down })
    } catch (e) {
      logger.warn(`× Error while attempting to require file ${filepath}: ${e.message}`)

      return false
    }
  }

  _init () {
    return this._createDatabase()
      .then(() => this._createMigrationsTable())
  }

  _createDatabase () {
    const { r, logger, config: { db } } = this

    return r.dbList().run().then((dbs) => {
      if (!dbs.includes(db)) {
        logger.info(`↗ Database ${db} does not exist - creating.`)

        const start = new Date()

        return r.dbCreate(db)
          .then(() => this._registerOp('_create_database', start))
          .then(() => logger.info(`⤷ Database ${db} created successfully.`))
      }

      logger.verbose(`↷ Database ${db} already exists, skipping creation.`)
    })
  }

  _createMigrationsTable () {
    const { logger, config: { migrations: { table: tableName } } } = this

    return this.db.tableList().run().then((tables) => {
      if (!tables.includes(tableName)) {
        logger.info(`↗ Migrations table ${tableName} does not exist - creating.`)

        const start = new Date()

        return this.db.tableCreate(tableName).run()
          .then(() => this._registerOp('_create_migrations_table', start))
          .then(() => logger.info(`⤷ Migrations table ${tableName} created successfully.`))
      }

      logger.verbose(`↷ Migrations table ${tableName} already exists, skipping creation.`)
    })
  }

  _registerOp (id, start, finish) {
    this._ops[id] = ((finish || new Date()) - start) / 1000
  }

  _runMigrationFunctions (migrations, functionName) {
    const { logger } = this
    const db = this.db

    return Promise.mapSeries(migrations, (migration) => {
      const { id } = migration
      const func = migration[functionName]

      logger.info(functionName === FUNC_NAME_UP ? `↑ Running migration ${id}...` : `↓ Reverting migration ${id}...`)

      const start = new Date()

      return func(db, logger)
        .then(() => {
          const completed = new Date()

          this._registerOp(id, start, completed)

          return { id, completed }
        })
    })
  }
}

export default Reconsider
