'use strict'

function getObj (id) {
  return {id, prop: Math.random(), sometime: new Date()}
}

const insert = {
  'foo': [ 1, 2, 3 ].map(getObj),
  'bar': [ 1, 2, 3, 4, 5, 6 ].map(getObj),
  'baz': [ 'yes', 'no', 'whut' ].map(getObj)
}

module.exports = {
  up: function (db, logger) {
    return Promise.mapSeries(Object.keys(insert), (tableName) => {
      return db.table(tableName).insert(insert[tableName]).run()
    })
  },
  down: function (db, logger, r) {
    return Promise.mapSeries(Object.keys(insert), (tableName) => {
      const ids = insert[tableName].map(({id}) => id)

      logger.debug(`Removing ids ${ids.join(', ')} from table ${tableName}`)

      return db.table(tableName).getAll(r.args(ids)).delete().run()
    })
  }
}
