'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createMigration = createMigration;
exports.createTablesMigration = createTablesMigration;
exports.createIndexMigration = createIndexMigration;

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createMigration(up, down) {
  if (typeof up !== 'function' || typeof down !== 'function') {
    throw new Error('Only functions can be passed to "createMigration".');
  }

  return { up: up, down: down };
}

function createTablesMigration(tables) {
  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    throw new Error('"createTablesMigration" expects a non-empty list of table names.');
  }

  var tableList = tables.join(', ');

  var up = function up(r, logger) {
    logger.verbose('Will create tables: ' + tableList);

    return _bluebird2.default.each(tables, function (table) {
      return r.tableCreate(table).run();
    });
  };

  var down = function down(r, logger) {
    logger.verbose('Will drop tables: ' + tableList);

    return _bluebird2.default.each(tables, function (table) {
      return r.tableDrop(table).run();
    });
  };

  return createMigration(up, down);
}

function createIndexMigration(indices) {}