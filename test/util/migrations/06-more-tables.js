'use strict'

// Yeah, I copy-pasted this file. I'm not proud of it, but I reckon there's no need to overengineer this...
// Still hurt a little though.

import Promise from 'bluebird'

const tables = [ 'more', 'tables' ]

export function up (r, logger) {
  logger.verbose(`Creating tables ${tables.join(', ')}`)

  return Promise.each(tables, (table) => r.tableCreate(table).run())
}

export function down (r, logger) {
  logger.verbose(`Dropping tables ${tables.join(', ')}`)

  return Promise.each(tables, (table) => r.tableDrop(table).run())
}
