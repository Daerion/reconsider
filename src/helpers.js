'use strict'

import Promise from 'bluebird'

/**
 * Creates a database migration object which is supposed to be exported by a migration file
 *
 * @param {function} up - Function to be executed when migrating up
 * @param {function} down - Function to be executed when migrating down
 * @returns {{up: *, down: *}}
 */
export function createMigration (up, down) {
  if (typeof up !== 'function' || typeof down !== 'function') {
    throw new Error('Only functions can be passed to "createMigration".')
  }

  return { up, down }
}

/**
 * Returns a migration object used for creating and dropping tables
 * Expects a list of table names that will be created when migrating up and dropped when migrating down.
 *
 * @param {array} tables - List of table names
 * @returns {{up: *, down: *}}
 */
export function createTablesMigration (tables) {
  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    throw new Error('"createTablesMigration" expects a non-empty list of table names.')
  }

  const tableList = tables.join(', ')

  const up = (r, logger) => {
    logger.verbose(`Will create tables: ${tableList}`)

    return Promise.each(tables, (table) => r.tableCreate(table).run())
  }

  const down = (r, logger) => {
    logger.verbose(`Will drop tables: ${tableList}`)

    return Promise.each(tables, (table) => r.tableDrop(table).run())
  }

  return createMigration(up, down)
}

/**
 * Returns a migration object used for creating and dropping indices on tables
 * Each index specification must contain both a "table" and an "index" property, and can optionally contain an
 * "options" object as well as a "spec" property.
 * "spec" properties must be functions, they will be called with the rethinkdbdash instance passed to them and they
 * are expected to return an index specification (which can be anything that indexCreate() accepts as a second
 * parameter).
 *
 * @param {array} indices - List of index specifications
 * @returns {{up: *, down: *}}
 */
export function createIndexMigration (indices) {
  if (!indices || !Array.isArray(indices) || indices.length === 0) {
    throw new Error('"createIndexMigration" expects a non-empty list of index specifications.')
  }

  if (indices.some((i) => typeof i !== 'object' || !i.table || !i.index || i.table.length === 0 || i.index.length === 0)) {
    throw new Error('All index specifications must be objects containing at least a "table" and an "index" property')
  }

  const up = (r, logger) => {
    return Promise.each(indices, ({ table, index, spec, options }) => {
      logger.verbose(`Creating index "${index}" in table "${table}"`)

      let args = [ index ]

      if (spec) {
        args.push(spec(r))
      }

      if (options) {
        args.push(options)
      }

      return r.table(table).indexCreate(...args).run()
        .then(() => r.table(table).indexWait(index))
    })
  }

  const down = (r, logger) => {
    logger.verbose(`Dropping indices ${indices.map(({ table, index }) => `${table}.${index}`).join(', ')}`)

    return Promise.each(indices, ({ table, index }) => r.table(table).indexDrop(index).run())
  }

  return createMigration(up, down)
}
