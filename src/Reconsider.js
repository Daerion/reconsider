'use strict'

import fs from 'fs'
import path from 'path'
import Promise from 'bluebird'

const readDirAsync = Promise.promisify(fs.readdir)

import { getLoggerObject } from './util'

const defaults = require('../defaults.json')

const FUNC_NAME_UP = 'up'
const FUNC_NAME_DOWN = 'down'

/**
 *
 */
class Reconsider {
  constructor (r, config = { }, logger) {
    this.r = r
    this.config = Object.assign({}, defaults, config)
    this.logger = getLoggerObject(logger)

    this._ops = { }

    if (!this.r || typeof this.r !== 'function' || typeof this.r.db !== 'function') {
      throw new Error('No or invalid database driver object passed to Reconsider constructor.')
    }

    if (!this.config.db) {
      throw new Error('No database name set in Reconsider config.')
    }
  }

  get migrationsTable () {
    return this.r.table(this.config.tableName)
  }

  migrateUp (exclude) {
    const { logger } = this

    logger.info('↑ Performing database migrations ↑')

    return this._init()
      .then(() => this.getMigrations(true, false, exclude))
      .then((migrations) => this._runMigrationFunctions(migrations, FUNC_NAME_UP))
      .then((completionInfo) => completionInfo.map(({ id }) => id))
      .then((ids) => logger.info(`Ran migrations ${ids.map((id) => `"${id}"`).join(', ')}.`))
      .then(() => this._ops)
  }

  migrateDown (exclude) {
    const { logger } = this

    logger.info('↓ Reverting database migrations ↓')

    return this._init()
      .then(() => this.getMigrations(false, true, exclude)) // Retrieve a list of all previously run migrations
      .then((migrations) => this._runMigrationFunctions(migrations, FUNC_NAME_DOWN)) // Run the "down" function for each
      .then((completionInfo) => completionInfo.map(({ id }) => id)) // Return an array of IDs of reverted migrations
      .then((revertedIds) => logger.info(`Reverted migrations ${revertedIds.map((id) => `"${id}"`).join(', ')}.`))
      .then(() => this._ops) // Return operation timing info
  }

  getMigrations (pending = true, completed = false, exclude = [ ]) {
    const { logger, config: { sourceDir } } = this

    logger.debug(`Reading list of migrations from directory ${sourceDir}.`)

    if (!pending && !completed) { // Someone *will* eventually do this
      throw new Error('Retreiving neither pending nor completed migrations is nonsensical.')
    }

    let infoObjects

    const completedMigrations = this.migrationsTable.orderBy(this.r.desc('completed')).run()

    if (!pending && completed) { // Retrieve only completed migrations (i.e. only those stored in the info table)
      infoObjects = completedMigrations
    } else {
      infoObjects = readDirAsync(sourceDir)
        // Filter out all non .js files
        .then((files) => files.filter((file) => file.endsWith('.js')))
        // Cut off filename extension so only the IDs remain
        .then((jsFiles) => jsFiles.map((file) => file.substr(0, file.lastIndexOf('.js'))))
        .then((migrationIds) => {
          // Retrieve a list of all completed migrations
          return completedMigrations.then((completedMigrations) => {
            // Return an array of migration info objects - using data retrieved from the table if available, and an
            // object with it's "completed" property set to false for pending ones
            return migrationIds.map((id) => completedMigrations.find((el) => el.id === id) || { id, completed: false })
          })
        })
        // Unless we're including completed migrations too, return only those with their "completed" property set to false
        .then((migrationInfo) => !completed ? migrationInfo.filter(({ completed }) => completed === false) : migrationInfo)
    }

    return infoObjects
      .then((info) => info.filter(({ id }) => !exclude.includes(id)))
      // Require each file and see if it exports an "up" and a "down" function
      .then((info) => info.map(this.getMigration.bind(this)))
      // Filter out all invalid migrations
      .then((migrations) => migrations.filter((m) => !!m))
  }

  getMigration (info) {
    const { logger, config: { sourceDir } } = this
    const filepath = path.resolve(sourceDir, `${info.id}.js`)

    logger.debug(`Attempting to require('${filepath}')`)

    try {
      const m = require(filepath)
      const up = m[FUNC_NAME_UP]
      const down = m[FUNC_NAME_DOWN]

      if (typeof up !== 'function' || typeof down !== 'function') {
        logger.warn(`× Cannot include migration "${info.id}": migration files must export an "${FUNC_NAME_UP}" and a "${FUNC_NAME_DOWN}" function.`)

        return false
      }

      return Object.assign({}, info, { [FUNC_NAME_UP]: up, [FUNC_NAME_DOWN]: down })
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
    const { logger, r, config: { tableName } } = this

    return this.r.tableList().run().then((tables) => {
      if (!tables.includes(tableName)) {
        logger.info(`↗ Migrations table ${tableName} does not exist - creating.`)

        const start = new Date()

        return r.tableCreate(tableName).run()
          .then(() => r.table(tableName).indexCreate('completed').run())
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
    const { logger, r } = this
    const migrationsTable = this.migrationsTable
    const migrateUp = functionName === FUNC_NAME_UP

    return Promise.mapSeries(migrations, (migration) => {
      const { id } = migration
      const func = migration[functionName]

      logger.info(migrateUp ? `↑ Running migration ${id}...` : `↓ Reverting migration ${id}...`)

      const start = new Date()

      return func(r, logger)
        .then(() => {
          const completed = new Date()

          this._registerOp(id, start, completed)

          return { id, completed }
        })
        .then((info) => {
          return (migrateUp ? migrationsTable.insert(info).run() : migrationsTable.get(info.id).delete().run())
            .then(() => info)
        })
    })
  }
}

export default Reconsider
export { FUNC_NAME_DOWN, FUNC_NAME_UP }
