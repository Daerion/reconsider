'use strict'

import Promise from 'bluebird'

function getObj (id) {
  return { id, prop: Math.random(), sometime: new Date() }
}

const insertData = {
  'foo': [ 1, 2, 3 ].map(getObj),
  'bar': [ 1, 2, 3, 4, 5, 6 ].map(getObj),
  'baz': [ 'yes', 'no', 'whut' ].map(getObj)
}
const tables = Object.keys(insertData)

export function up (r, logger) {
  return Promise.mapSeries(tables, (tableName) => {
    logger.verbose(`Inserting data into table ${tableName}`)

    return r.table(tableName).insert(insertData[tableName]).run()
  })
}

export function down (r, logger) {
  return Promise.mapSeries(tables, (tableName) => {
    const ids = insertData[tableName].map(({ id }) => id)

    logger.debug(`Removing ids ${ids.join(', ')} from table ${tableName}`)

    return r.table(tableName).getAll(r.args(ids)).delete().run()
  })
}
