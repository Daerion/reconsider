'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FUNC_NAME_UP = exports.FUNC_NAME_DOWN = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var readDirAsync = _bluebird2.default.promisify(_fs2.default.readdir);

var defaults = require('../defaults.json');

var FUNC_NAME_UP = 'up';
var FUNC_NAME_DOWN = 'down';

var Reconsider = function () {
  function Reconsider(r) {
    var config = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    var logger = arguments[2];

    _classCallCheck(this, Reconsider);

    if (!r || typeof r !== 'function' || typeof r.db !== 'function') {
      throw new Error('No or invalid database driver object passed to Reconsider constructor.');
    }

    this.r = r;
    this.config = Object.assign({}, defaults, config);
    this.logger = (0, _util.getLoggerObject)(logger);

    this._ops = [];

    if (!this.config.db) {
      throw new Error('No database name set in Reconsider config.');
    }
  }

  _createClass(Reconsider, [{
    key: 'migrateUp',
    value: function migrateUp(exclude) {
      var _this = this;

      var logger = this.logger;

      logger.info('↑ Performing database migrations ↑');

      return this._init().then(function () {
        return _this.getMigrations(true, false, exclude);
      }).then(function (migrations) {
        return _this._runMigrationFunctions(migrations, FUNC_NAME_UP);
      }).then(function (completionInfo) {
        return completionInfo.map(function (_ref) {
          var id = _ref.id;
          return id;
        });
      }).then(function (ids) {
        return logger.info('Ran migrations ' + ids.map(function (id) {
          return '"' + id + '"';
        }).join(', ') + '.');
      }).then(function () {
        return _this._ops;
      });
    }
  }, {
    key: 'migrateDown',
    value: function migrateDown(exclude) {
      var _this2 = this;

      var logger = this.logger;

      logger.info('↓ Reverting database migrations ↓');

      return this._init().then(function () {
        return _this2.getMigrations(false, true, exclude);
      }).then(function (migrations) {
        return _this2._runMigrationFunctions(migrations, FUNC_NAME_DOWN);
      }).then(function (completionInfo) {
        return completionInfo.map(function (_ref2) {
          var id = _ref2.id;
          return id;
        });
      }).then(function (revertedIds) {
        return logger.info('Reverted migrations ' + revertedIds.map(function (id) {
          return '"' + id + '"';
        }).join(', ') + '.');
      }).then(function () {
        return _this2._ops;
      });
    }
  }, {
    key: 'getMigrations',
    value: function getMigrations() {
      var pending = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];

      var _this3 = this;

      var completed = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
      var exclude = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
      var logger = this.logger;
      var sourceDir = this.config.sourceDir;

      logger.debug('Reading list of migrations from directory ' + sourceDir + '.');

      if (!pending && !completed) {
        throw new Error('Retreiving neither pending nor completed migrations is nonsensical.');
      }

      var infoObjects = undefined;

      var completedMigrations = this.migrationsTable.orderBy(this.r.desc('completed')).run();

      if (!pending && completed) {
        infoObjects = completedMigrations;
      } else {
        infoObjects = readDirAsync(sourceDir).then(function (files) {
          return files.filter(function (file) {
            return file.endsWith('.js');
          });
        }).then(function (jsFiles) {
          return jsFiles.map(function (file) {
            return file.substr(0, file.lastIndexOf('.js'));
          });
        }).then(function (migrationIds) {
          return completedMigrations.then(function (completedMigrations) {
            return migrationIds.map(function (id) {
              return completedMigrations.find(function (el) {
                return el.id === id;
              }) || { id: id, completed: false };
            });
          });
        }).then(function (migrationInfo) {
          return !completed ? migrationInfo.filter(function (_ref3) {
            var completed = _ref3.completed;
            return completed === false;
          }) : migrationInfo;
        });
      }

      return infoObjects.then(function (info) {
        return info.filter(function (_ref4) {
          var id = _ref4.id;
          return !exclude.includes(id);
        });
      }).then(function (info) {
        return info.map(_this3.getMigration.bind(_this3));
      }).then(function (migrations) {
        return migrations.filter(function (m) {
          return !!m;
        });
      });
    }
  }, {
    key: 'getMigration',
    value: function getMigration(info) {
      var logger = this.logger;
      var sourceDir = this.config.sourceDir;

      var filepath = _path2.default.resolve(sourceDir, info.id + '.js');

      logger.debug('Attempting to require(\'' + filepath + '\')');

      try {
        var _Object$assign;

        var m = require(filepath);
        var up = m[FUNC_NAME_UP];
        var down = m[FUNC_NAME_DOWN];

        if (typeof up !== 'function' || typeof down !== 'function') {
          logger.warn('× Cannot include migration "' + info.id + '": migration files must export an "' + FUNC_NAME_UP + '" and a "' + FUNC_NAME_DOWN + '" function.');

          return false;
        }

        return Object.assign({}, info, (_Object$assign = {}, _defineProperty(_Object$assign, FUNC_NAME_UP, up), _defineProperty(_Object$assign, FUNC_NAME_DOWN, down), _Object$assign));
      } catch (e) {
        logger.warn('× Error while attempting to require file ' + filepath + ': ' + e.message);

        return false;
      }
    }
  }, {
    key: '_init',
    value: function _init() {
      var _this4 = this;

      return this._createDatabase().then(function () {
        return _this4._createMigrationsTable();
      });
    }
  }, {
    key: '_createDatabase',
    value: function _createDatabase() {
      var _this5 = this;

      var r = this.r;
      var logger = this.logger;
      var db = this.config.db;

      return r.dbList().run().then(function (dbs) {
        if (!dbs.includes(db)) {
          var _ret = function () {
            logger.info('↗ Database ' + db + ' does not exist - creating.');

            var start = new Date();

            return {
              v: r.dbCreate(db).then(function () {
                return _this5._registerOp('_create_database', start);
              }).then(function () {
                return logger.info('⤷ Database ' + db + ' created successfully.');
              })
            };
          }();

          if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }

        logger.verbose('↷ Database ' + db + ' already exists, skipping creation.');
      });
    }
  }, {
    key: '_createMigrationsTable',
    value: function _createMigrationsTable() {
      var _this6 = this;

      var logger = this.logger;
      var r = this.r;
      var tableName = this.config.tableName;

      return this.r.tableList().run().then(function (tables) {
        if (!tables.includes(tableName)) {
          var _ret2 = function () {
            logger.info('↗ Migrations table ' + tableName + ' does not exist - creating.');

            var start = new Date();

            return {
              v: r.tableCreate(tableName).run().then(function () {
                return r.table(tableName).indexCreate('completed').run();
              }).then(function () {
                return _this6._registerOp('_create_migrations_table', start);
              }).then(function () {
                return logger.info('⤷ Migrations table ' + tableName + ' created successfully.');
              })
            };
          }();

          if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
        }

        logger.verbose('↷ Migrations table ' + tableName + ' already exists, skipping creation.');
      });
    }
  }, {
    key: '_registerOp',
    value: function _registerOp(id, start, finish) {
      this._ops.push({
        id: id,
        elapsed: ((finish || new Date()) - start) / 1000
      });
    }
  }, {
    key: '_runMigrationFunctions',
    value: function _runMigrationFunctions(migrations, functionName) {
      var _this7 = this;

      var logger = this.logger;
      var r = this.r;

      var migrationsTable = this.migrationsTable;
      var migrateUp = functionName === FUNC_NAME_UP;

      return _bluebird2.default.mapSeries(migrations, function (migration) {
        var id = migration.id;

        var func = migration[functionName];

        logger.info(migrateUp ? '↑ Running migration ' + id + '...' : '↓ Reverting migration ' + id + '...');

        var start = new Date();

        return func(r, logger).then(function () {
          var completed = new Date();

          _this7._registerOp(id, start, completed);

          return { id: id, completed: completed };
        }).then(function (info) {
          return (migrateUp ? migrationsTable.insert(info).run() : migrationsTable.get(info.id).delete().run()).then(function () {
            return info;
          });
        });
      });
    }
  }, {
    key: 'migrationsTable',
    get: function get() {
      return this.r.table(this.config.tableName);
    }
  }]);

  return Reconsider;
}();

exports.default = Reconsider;
exports.FUNC_NAME_DOWN = FUNC_NAME_DOWN;
exports.FUNC_NAME_UP = FUNC_NAME_UP;