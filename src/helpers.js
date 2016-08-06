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

export function createIndexMigration (indices) {

}
