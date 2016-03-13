'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _deepmerge = require('deepmerge');

var _deepmerge2 = _interopRequireDefault(_deepmerge);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var readDirAsync = _bluebird2.default.promisify(_fs2.default.readdir);

var defaults = require('../defaults.json');

var FUNC_NAME_UP = 'up';
var FUNC_NAME_DOWN = 'down';

var Reconsider = function () {
  function Reconsider(r, config, logger) {
    _classCallCheck(this, Reconsider);

    this.r = r;
    this.config = (0, _deepmerge2.default)(defaults, config || {});
    this.logger = (0, _util.getLoggerObject)(logger);

    this._ops = {};

    if (!this.r || typeof this.r !== 'function' || typeof this.r.db !== 'function') {
      throw new Error('No or invalid database driver object passed to Reconsider constructor.');
    }

    if (!this.config.db) {
      throw new Error('No database name set in Reconsider config.');
    }
  }

  _createClass(Reconsider, [{
    key: 'migrateUp',
    value: function migrateUp() {
      var _this = this;

      var logger = this.logger;

      logger.info('↑ Performing database migrations ↑');

      return this._init().then(function () {
        return _this.getMigrations();
      }).then(function (migrations) {
        return _this._runMigrationFunctions(migrations, FUNC_NAME_UP);
      }).then(function (completionInfo) {
        return _this.migrationsTable.insert(completionInfo).run();
      }).then(function () {
        return _this._ops;
      });
    }
  }, {
    key: 'migrateDown',
    value: function migrateDown() {
      var _this2 = this;

      var logger = this.logger;

      logger.info('↓ Reverting database migrations ↓');

      return this._init().then(function () {
        return _this2.getMigrations(false, true);
      }).then(function (migrations) {
        return _this2._runMigrationFunctions(migrations, FUNC_NAME_DOWN);
      }).then(function (completionInfo) {
        return completionInfo.map(function (_ref) {
          var id = _ref.id;
          return id;
        });
      }).then(function (revertedIds) {
        return _this2.migrationsTable.getAll(_this2.r.args(revertedIds)).delete().run();
      }).then(function () {
        return _this2._ops;
      });
    }
  }, {
    key: 'getMigrations',
    value: function getMigrations() {
      var _this3 = this;

      var pending = arguments.length <= 0 || arguments[0] === undefined ? true : arguments[0];
      var completed = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
      var logger = this.logger;
      var dir = this.config.migrations.dir;

      logger.debug('Reading list of migrations from directory ' + dir + '.');

      if (!pending && !completed) {
        // Someone *will* eventually do this
        throw new Error('Retreiving neither pending nor completed migrations is nonsensical.');
      }

      var infoObjects = undefined;

      if (!pending && completed) {
        // Retrieve only completed migrations (i.e. only those stored in the info table)
        infoObjects = this.migrationsTable.run();
      } else {
        infoObjects = readDirAsync(dir)
        // Filter out all non .js files
        .then(function (files) {
          return files.filter(function (file) {
            return file.endsWith('.js');
          });
        })
        // Cut off filename extension so only the IDs remain
        .then(function (jsFiles) {
          return jsFiles.map(function (file) {
            return file.substr(0, file.lastIndexOf('.js'));
          });
        }).then(function (migrationIds) {
          // Retrieve a list of all completed migrations
          return _this3.migrationsTable.run().then(function (completedMigrations) {
            // Return an array of migration info objects - using data retrieved from the table if available, and an
            // object with it's "completed" property set to false for pending ones
            return migrationIds.map(function (id) {
              return completedMigrations.find(function (el) {
                return el.id === id;
              }) || { id: id, completed: false };
            });
          });
        })
        // Unless we're including completed migrations too, return only those with their "completed" property set to false
        .then(function (migrationInfo) {
          return !completed ? migrationInfo.filter(function (_ref2) {
            var completed = _ref2.completed;
            return completed === false;
          }) : migrationInfo;
        });
      }

      return infoObjects
      // Require each file and see if it exports an "up" and a "down" function
      .then(function (info) {
        return info.map(_this3.getMigration.bind(_this3));
      })
      // Filter out all invalid migrations
      .then(function (migrations) {
        return migrations.filter(function (m) {
          return !!m;
        });
      });
    }
  }, {
    key: 'getMigration',
    value: function getMigration(info) {
      var logger = this.logger;
      var dir = this.config.migrations.dir;

      var filepath = _path2.default.resolve(dir, info.id + '.js');

      logger.debug('Attempting to require(\'' + filepath + '\')');

      try {
        var m = require(filepath);
        var up = m[FUNC_NAME_UP];
        var down = m[FUNC_NAME_DOWN];

        if (typeof up !== 'function' || typeof down !== 'function') {
          logger.warn('× Cannot include migration "' + info.id + '": migration files must export an "' + FUNC_NAME_UP + '" and a "' + FUNC_NAME_DOWN + '" function.');

          return false;
        }

        return Object.assign({}, info, { up: up, down: down });
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
      var tableName = this.config.migrations.table;

      return this.db.tableList().run().then(function (tables) {
        if (!tables.includes(tableName)) {
          var _ret2 = function () {
            logger.info('↗ Migrations table ' + tableName + ' does not exist - creating.');

            var start = new Date();

            return {
              v: _this6.db.tableCreate(tableName).run().then(function () {
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
      this._ops[id] = ((finish || new Date()) - start) / 1000;
    }
  }, {
    key: '_runMigrationFunctions',
    value: function _runMigrationFunctions(migrations, functionName) {
      var _this7 = this;

      var logger = this.logger;

      var db = this.db;

      return _bluebird2.default.mapSeries(migrations, function (migration) {
        var id = migration.id;

        var func = migration[functionName];

        logger.info(functionName === FUNC_NAME_UP ? '↑ Running migration ' + id + '...' : '↓ Reverting migration ' + id + '...');

        var start = new Date();

        return func(db, logger).then(function () {
          var completed = new Date();

          _this7._registerOp(id, start, completed);

          return { id: id, completed: completed };
        });
      });
    }
  }, {
    key: 'db',
    get: function get() {
      return this.r.db(this.config.db);
    }
  }, {
    key: 'migrationsTable',
    get: function get() {
      return this.db.table(this.config.migrations.table);
    }
  }]);

  return Reconsider;
}();

exports.default = Reconsider;