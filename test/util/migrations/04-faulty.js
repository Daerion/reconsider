'use strict'

const tableName = 'i_do_not_exist'

// Attempt to insert into a non-existing table
export function up (r, logger) {
  logger.verbose(`Attempting to insert into non-existing table ${tableName}.`)

  return r.table(tableName).insert({ id: 1, doesItMatter: false }).run()
}

export function down (r, logger) {
  logger.verbose(`Attempting to delete from non-existing table ${tableName}.`)

  return r.table(tableName).get(1).delete().run()
}
