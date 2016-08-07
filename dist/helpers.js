'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

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

function createIndexMigration(indices) {
  if (!indices || !Array.isArray(indices) || indices.length === 0) {
    throw new Error('"createIndexMigration" expects a non-empty list of index specifications.');
  }

  if (indices.some(function (i) {
    return (typeof i === 'undefined' ? 'undefined' : _typeof(i)) !== 'object' || !i.table || !i.index || i.table.length === 0 || i.index.length === 0;
  })) {
    throw new Error('All index specifications must be objects containing at least a "table" and an "index" property');
  }

  var up = function up(r, logger) {
    return _bluebird2.default.each(indices, function (_ref) {
      var _r$table;

      var table = _ref.table;
      var index = _ref.index;
      var spec = _ref.spec;
      var options = _ref.options;

      logger.verbose('Creating index "' + index + '" in table "' + table + '"');

      var args = [index];

      if (spec) {
        args.push(spec(r));
      }

      if (options) {
        args.push(options);
      }

      return (_r$table = r.table(table)).indexCreate.apply(_r$table, args).run().then(function () {
        return r.table(table).indexWait(index);
      });
    });
  };

  var down = function down(r, logger) {
    logger.verbose('Dropping indices ' + indices.map(function (_ref2) {
      var table = _ref2.table;
      var index = _ref2.index;
      return table + '.' + index;
    }).join(', '));

    return _bluebird2.default.each(indices, function (_ref3) {
      var table = _ref3.table;
      var index = _ref3.index;
      return r.table(table).indexDrop(index).run();
    });
  };

  return createMigration(up, down);
}