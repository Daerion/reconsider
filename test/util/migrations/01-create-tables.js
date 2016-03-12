'use strict'

const tables = [ 'foo', 'bar', 'baz' ]

module.exports = {
  up: function (db, logger) {
    logger.verbose(`Creating tables ${tables.join(', ')}`)

    return Promise.all(tables.map((table) => db.tableCreate(table).run()))
  },
  down: function (db, logger) {
    logger.verbose(`Dropping tables ${tables.join(', ')}`)

    return Promise.all(tables.map((table) => db.tableDrop(table).run()))
  }
}
