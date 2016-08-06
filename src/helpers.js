'use strict'

export function createMigration (up, down) {
  if (typeof up !== 'function' || typeof down !== 'function') {
    throw new Error('Only functions can be passed to "createMigration".')
  }

  return { up, down }
}

export function createTablesMigration (tables) {

}

export function createIndexMigration (indices) {

}
