'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _deepmerge = require('deepmerge');

var _deepmerge2 = _interopRequireDefault(_deepmerge);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaults = {
  db: null,
  migrations: {
    dir: 'migrations',
    table: '_reconsider_migrations'
  },
  swallowErrors: false
};

var Reconsider = function () {
  function Reconsider(r, config, logger) {
    _classCallCheck(this, Reconsider);

    this.r = r;
    this.config = (0, _deepmerge2.default)(defaults, config || {});
    this.logger = (0, _util.getLoggerObject)(logger);

    this._ops = {};

    if (!this.config.db) {
      throw new Error('No database name set in Reconsider config.');
    }
  }

  _createClass(Reconsider, [{
    key: 'init',
    value: function init() {
      var _this = this;

      return this._createDatabase().then(function () {
        return _this._createMigrationsTable();
      });
    }
  }, {
    key: 'migrateUp',
    value: function migrateUp() {
      var _this2 = this;

      var logger = this.logger;

      logger.info('↑ Performing database migrations ↑');

      return this.init().then(function () {
        return _bluebird2.default.resolve(_this2._ops);
      });
    }
  }, {
    key: 'migrateDown',
    value: function migrateDown() {
      var logger = this.logger;

      logger.info('↓ Reverting database migrations ↓');

      return _bluebird2.default.resolve({
        'foo': 2.124156,
        'bar': 5.125,
        'baz': 0.01026
      });
    }
  }, {
    key: '_createDatabase',
    value: function _createDatabase() {
      var _this3 = this;

      var r = this.r;
      var logger = this.logger;
      var db = this.config.db;

      return r.dbList().run().then(function (dbs) {
        if (!dbs.includes(db)) {
          var _ret = function () {
            logger.info('Database ' + db + ' does not exist - creating.');

            var start = new Date();

            return {
              v: r.dbCreate(db).then(function () {
                return _this3._registerOp('_create_database', start);
              }).then(function () {
                return logger.info('↳ Database ' + db + ' created successfully.');
              })
            };
          }();

          if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }

        logger.verbose('⤼ Database ' + db + ' already exists, skipping creation.');
      });
    }
  }, {
    key: '_createMigrationsTable',
    value: function _createMigrationsTable() {
      var _this4 = this;

      var logger = this.logger;
      var tableName = this.config.migrations.table;

      return this.db.tableList().run().then(function (tables) {
        if (!tables.includes(tableName)) {
          var _ret2 = function () {
            logger.info('Migrations table ' + tableName + ' does not exist - creating.');

            var start = new Date();

            return {
              v: _this4.db.tableCreate(tableName).run().then(function () {
                return _this4._registerOp('_create_migrations_table', start);
              }).then(function () {
                return logger.info('↳ Migrations table ' + tableName + ' created successfully.');
              })
            };
          }();

          if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
        }

        logger.verbose('⤼ Migrations table ' + tableName + ' already exists, skipping creation.');
      });
    }
  }, {
    key: '_registerOp',
    value: function _registerOp(id, start) {
      this._ops[id] = (new Date() - start) / 1000;
    }
  }, {
    key: 'db',
    get: function get() {
      return this.r.db(this.config.db);
    }
  }]);

  return Reconsider;
}();

exports.default = Reconsider;