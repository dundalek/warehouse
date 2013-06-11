var persist = require('persist'),
    Q = require('q'),
    _ = require('underscore-data'),
    extend = require('..').extend,
    util = require('util'),
    BaseBackend = require('./base'),
    rql = require('../rql/sql');

/** @class SqlBackend */
var SqlBackend = BaseBackend.extend(
/** @lends SqlBackend# */
{
    /** */
    initialize: function(options) {
        options = _.extend({driver: 'mysql'}, SqlBackend.defaults, options || {});
        this.options = options;

        this._opened = null;
    },

    /** */
    objectStoreNames: function() {
        var sql = (this.options.driver === 'sqlite3')
            ? "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
            : "SHOW TABLES;";
        return this.runSqlAll(sql);
    },

    /** */
    objectStore: function(name, options) {
        return new SqlStore(this, name, options);
    },

    /** */
    createObjectStore: function(name, options) {
        throw 'Not implemented - please use CREATE TABLE query';
    },

    /** */
    deleteObjectStore: function(name) {
        return this.runSql('DROP TABLE ' + SqlStore.prototype.escapeIdentifier(name));
    },

    /** */
    open: function() {
        if (!this._opened) {
            this._opened = Q.ninvoke(persist, 'connect', this.options);
        }
        return this._opened;
    },

    /** */
    close: function() {
        throw 'Not implemented!';
    },

    /** */
    isClosed: function() {
        return Q.defer()
                .resolve(!!this._opened);
    },

    /** */
    runSql: function(sql, values) {
        return this.open().then(function(connection) {
            return Q.ninvoke(connection, 'runSql', sql, values||[]);
        });
    },

    /** */
    runSqlAll: function(sql, values) {
        return this.open().then(function(connection) {
            return Q.ninvoke(connection, 'runSqlAll', sql, values||[]);
        });
    },
});

SqlBackend.defaults = {
    host: 'localhost',
    port: 3306,
    database: 'default'
};


/** @class SqlStore */
var SqlStore = BaseBackend.BaseStore.extend(
/** @lends SqlStore# */
{
    /** */
    get: function(directives) {
        var key = this._getObjectKey({}, directives),
            sql = util.format('SELECT * FROM %s WHERE %s = ?;',
                              this.escapeIdentifier(this.name),
                              this.escapeIdentifier(this.keyPath));
        
        return this.runSqlAll(sql, [key])
            .then(function(result) {
                return result[0] || {};
            });
    },

    /** */
    add: function(object, directives) {
        var args = [],
            placeholders = [],
            self = this;

        for (var k in object) {
            args.push(object[k]);
            placeholders.push(this.escapeIdentifier(k));
        }

        var sql = util.format('INSERT INTO %s (%s) VALUES (%s);',
                              this.escapeIdentifier(this.name),
                              placeholders.join(','),
                              args.map(function() {return '?'}).join(','));

        return this.runSql(sql, args)
            .then(function(result) {
                // handle autoincrement
                if (result.insertId) {
                    // MySQL
                    object[self.keyPath] = result.insertId;
                } else if (result.lastId) {
                    // Sqlite
                    object[self.keyPath] = result.lastId;
                }
                return object;
            });
    },

    /** */
    put: function(object, directives) {
        var key = this._getObjectKey(object, directives),
            args = [],
            placeholders = [];

        for (var k in object) {
            args.push(object[k]);
            placeholders.push(this.escapeIdentifier(k)+'=?');
        }

        args.push(key);

        var sql = util.format('UPDATE %s SET %s WHERE %s = ?;',
                              this.escapeIdentifier(this.name),
                              placeholders.join(','),
                              this.escapeIdentifier(this.keyPath));

        return this.runSql(sql, args)
            .then(function(result) {
                return object;
            });
    },

    /** */
    'delete': function(directives) {
        var key = this._getObjectKey({}, directives),
            sql = util.format('DELETE FROM %s WHERE %s = ?;',
                              this.escapeIdentifier(this.name),
                              this.escapeIdentifier(this.keyPath));

        return this.runSql(sql, [key])
            .then(function(result) {
                // return number of affected rows
                var ret = 0;
                if ('affectedRows' in result) {
                    // MySQL
                    ret = result.affectedRows;
                } else if ('changes' in result) {
                    // Sqlite
                    ret = result.changes;
                }
                return ret;
            });
    },

    /** Execute RQL query */
    query: function(query) {
        var sql = this.parse(query);

        return this.runSqlAll(sql, [])
            .then(function(result) {
                if (result[0] && result[0][0]) {
                  // sqlite
                  result = result[0];
                }
                return result || [];
            });
    },

    /** Get connection object */
    connection: function() {
        return this.backend.open();
    },

    /** Delete all items */
    clear: function() {
        var sql = util.format('DELETE FROM %s;', this.escapeIdentifier(this.name));
        return this.runSql(sql);
    },

    /** Escape table or column name */
    escapeIdentifier: rql.sqlEscapeIdentifier,

    /** */
    runSql: function(sql, values) {
        return this.backend.runSql(sql, values);
    },

    /** */
    runSqlAll: function(sql, values) {
        return this.backend.runSqlAll(sql, values);
    },

    /**
     * Parse RQL query
     * @function
     */
    parse: function(query) {
        return rql.rql2sql(_.rql(query), {table: this.name});
    }
});

SqlBackend.SqlStore = SqlStore;
SqlBackend.rql2sql = rql.rql2sql;

module.exports = SqlBackend;
