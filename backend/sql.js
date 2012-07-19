var persist = require('persist'),
    Q = require('q'),
    _ = require('underscore-data'),
    extend = require('..').extend,
    util = require('util'),
    BaseBackend = require('./base');



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
            return Q.ncall(connection.runSql, connection, sql, values||[]);
        });
    },

    /** */
    runSqlAll: function(sql, values) {
        return this.open().then(function(connection) {
            return Q.ncall(connection.runSqlAll, connection, sql, values||[]);
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
    escapeIdentifier: function(value) {
        // http://dev.mysql.com/doc/refman/5.0/en/identifiers.html
        // http://www.sqlite.org/lang_keywords.html
        return '`' + value.replace(/`/g, '``') + '`';
    },

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
        return rql2sql(query, {table: this.name});
    }
});



/*
 * following RQL to SQL conversion taken from:
 *   http://github.com/persvr/perstore/blob/master/store/sql.js
 */

var sqlOperators = {
    "and" : "&",
    "or" : "|",
    "eq" : "=",
    "ne" : "!=",
    "le" : "<=",
    "ge" : ">=",
    "lt" : "<",
    "gt" : ">"
};

var valueToSql = function(value){
    if(value instanceof Array){
        return "(" + value.map(function(element){
            return valueToSql(element);
        }).join(",") + ")";
    }
    return typeof(value) == "string" ? "'" + value.replace(/'/g,"''") + "'" : value + '';
};

var safeSqlName = function(name){
  if(name.match(/[^\w_*]/)){
    throw new URIError("Illegal column name " + name);
  }
  name = SqlStore.prototype.escapeIdentifier(name);
  return name;
};

var generateSql = function(structure){
  return "SELECT " + structure.select + " FROM " + structure.from +
    (structure.where && (" WHERE " + structure.where)) + (structure.order.length ? (" ORDER BY " + structure.order.join(", ")): "");
};

var generateSqlCount = function(structure){
  return "SELECT COUNT(*) as count FROM " + structure.from +
    (structure.where && (" WHERE " + structure.where));
};

var generateSqlWithLimit = function(structure, limit, offset){
  return store.generateSql(structure) + " LIMIT " + limit + " OFFSET " + offset;
};

var toSQL = function(options) {
  options = options || {};
  var query = this;
  var limit, count, offset, postHandler, results = true;
  var where = "";
  var select = this.selectColumns || ['*'];
  var order = [];
  var params = (options.parameters = options.parameters || []);

  function convertRql(query){
      var conjunction = query.name;
      query.args.forEach(function(term, index){
          var column = term.args[0];
          switch(term.name){
              case "eq":
                  if(term.args[1] instanceof Array){
                      if(term.args[1].length == 0){
                          // an empty IN clause is considered invalid SQL
                          if(index > 0){
                              where += " " + conjunction + " ";
                          }
                          where += "0=1";
                      }
                      else{
                          safeSqlName(column);
                          addClause(column + " IN " + valueToSql(term.args[1]));
                      }
                      break;
                  }
                  // else fall through
              case "ne": case "lt": case "le": case "gt": case "ge":
                  safeSqlName(column);
                  addClause(options.table + '.' + column + sqlOperators[term.name] + valueToSql(term.args[1]));
                  break;
              case "sort":
                  if(term.args.length === 0)
                      throw new URIError("Must specify a sort criteria");
                  term.args.forEach(function(sortAttribute){
                      var firstChar = sortAttribute.charAt(0);
                      var orderDir = "ASC";
                      if(firstChar == "-" || firstChar == "+"){
                          if(firstChar == "-"){
                              orderDir = "DESC";
                          }
                          sortAttribute = sortAttribute.substring(1);
                      }
                      safeSqlName(sortAttribute);
                      order.push(options.table + "." + sortAttribute + " " + orderDir);
                  });
                  break;
              case "and": case "or":
                  where += "(";
                  convertRql(term);
                  where += ")";
                  break;
              case "in":
                  print("in() is deprecated");
                  if(term.args[1].length == 0){
                      // an empty IN clause is considered invalid SQL
                      if(index > 0){
                          where += " " + conjunction + " ";
                      }
                      where += "0=1";
                  }
                  else{
                      safeSqlName(column);
                      addClause(column + " IN " + valueToSql(term.args[1]));
                  }
                  break;
              case "select":
                  term.args.forEach(safeSqlName);
                  select = term.args.join(",");
                  break;
              case "distinct":
                  select = "DISTINCT " + select;
                  break;
              case "count":
                  count = true;
                  results = false;
                  postHandler = function(){
                      return count;
                  };
                  break;
              case "one": case "first":
                  limit = term.name == "one" ? 2 : 1;
                  postHandler = function(){
                      var firstRow;
                      return when(results.rows.some(function(row){
                          if(firstRow){
                              throw new TypeError("More than one object found");
                          }
                          firstRow = row;
                      }), function(){
                          return firstRow;
                      });
                  };
                  break;
              case "limit":
                  limit = term.args[0];
                  offset = term.args[1];
                  count = term.args[2] > limit;
                  break;
              case "mean":
                  term.name = "avg";
              case "sum": case "max": case "min":
                  select = term.name + "(" + safeSqlName(column) + ") as value";
                  postHandler = function(){
                      var firstRow;
                      return when(results.rows.some(function(row){
                          firstRow = row;
                      }), function(){
                          return firstRow.value;
                      });
                  };
                  break;
              default:
                  throw new URIError("Invalid query syntax, " + term.name+ " not implemented");
          }
          function addClause(sqlClause){
              if(where){
                  where += " " + conjunction + " ";
              }
              where += sqlClause;
          }
      });
  }
  convertRql(query);
  var structure = {
      select: select,
      where: where,
      from: options.table,
      order: order
  };
  var sql;
  if(count){
      sql = generateSqlCount(structure);
  } else {
    sql = limit ?
        generateSqlWithLimit(structure, limit, offset || 0) :
        generateSql(structure);
  }
  return sql;
};

var rql2sql = function(query, options) {
    return toSQL.call(_.rql(query), options);
};

SqlBackend.SqlStore = SqlStore;
SqlBackend.rql2sql = rql2sql;

module.exports = SqlBackend;
