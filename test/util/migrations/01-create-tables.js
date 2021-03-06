'use strict'

import Promise from 'bluebird'

const tables = [ 'foo', 'bar', 'baz' ]

export function up (r, logger) {
  logger.verbose(`Creating tables ${tables.join(', ')}`)

  return Promise.each(tables, (table) => r.tableCreate(table).run())
}

export function down (r, logger) {
  logger.verbose(`Dropping tables ${tables.join(', ')}`)

  return Promise.each(tables, (table) => r.tableDrop(table).run())
}
