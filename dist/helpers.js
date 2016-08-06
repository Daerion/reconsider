'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createMigration = createMigration;
exports.createTablesMigration = createTablesMigration;
exports.createIndexMigration = createIndexMigration;
function createMigration(up, down) {
  if (typeof up !== 'function' || typeof down !== 'function') {
    throw new Error('Only functions can be passed to "createMigration".');
  }

  return { up: up, down: down };
}

function createTablesMigration(tables) {}

function createIndexMigration(indices) {}