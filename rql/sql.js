
(function (factory) {
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof require !== 'undefined') {
        // CommonJS
        factory(module.exports, require('underscore-data'));
    } else {
        // running in browser
        window.warehouse = window.warehouse || {};
        factory(window.warehouse, _);
    }
})(function(exports, _) {

function sqlEscapeIdentifier(value) {
    // http://dev.mysql.com/doc/refman/5.0/en/identifiers.html
    // http://www.sqlite.org/lang_keywords.html
    return '`' + value.replace(/`/g, '``') + '`';
}

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
  name = sqlEscapeIdentifier(name);
  return name;
};

var generateSql = function(structure){
  var sql = "SELECT " + (structure.distinct ? 'DISTINCT ' : '') + structure.select + " FROM " + structure.from +
    (structure.where && (" WHERE " + structure.where)) + (structure.order.length ? (" ORDER BY " + structure.order.join(", ")): "");
  if (structure.groupBy) {
    sql += " GROUP BY " + structure.groupBy;
  }
  if (structure.limit) {
    sql += " LIMIT " + structure.limit + " OFFSET " + structure.offset;
  }
  return sql;
};

var generateSqlCount = function(structure){
  return "SELECT COUNT(*) as count FROM " + structure.from +
    (structure.where && (" WHERE " + structure.where));
};

var toSQL = function(options) {
  options = options || {};
  var query = this;
  var limit, count, offset, postHandler, results = true;
  var where = "";
  var select = [];
  var distinct = false;
  var order = [], groupBy = '';
  var params = (options.parameters = options.parameters || []);

  function convertRql(query){
      var conjunction = query.name;
      query.args.forEach(function(term, index){
          var column = term.args[0];
          switch(term.name){
              case "eq":
                  if(term.args[1] instanceof Array){
                      if(term.args[1].length === 0){
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
                  addClause("(");
                  convertRql(term);
                  where += ")";
                  break;
              case "in":
                  //print("in() is deprecated");
                  if(term.args[1].length === 0){
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
              case "out":
                  //print("in() is deprecated");
                  if(term.args[1].length === 0){
                      // an empty IN clause is considered invalid SQL
                      if(index > 0){
                          where += " " + conjunction + " ";
                      }
                      where += "0=1";
                  }
                  else{
                      safeSqlName(column);
                      addClause(column + " NOT IN " + valueToSql(term.args[1]));
                  }
                  break;
              case "select":
                  term.args.forEach(safeSqlName);
                  select = select.concat(term.args);
                  break;
              case "distinct":
                  distinct = true;
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
              case "aggregate":
                  groupBy = column;
                  safeSqlName(groupBy);
                  column = term.args[1].args[0];
                  term.name = term.args[1].name;
                  // break is intentionally missing
              case "mean":
                  term.name = "avg";
              case "sum": case "max": case "min":
                  select.push(term.name + "(" + safeSqlName(column) + ") as value");
                  postHandler = function(){
                      var firstRow;
                      return when(results.rows.some(function(row){
                          firstRow = row;
                      }), function(){
                          return firstRow.value;
                      });
                  };
                  break;
              case "search":
                  safeSqlName(column);
                  addClause("MATCH (" + column + ") AGAINST (" + valueToSql(term.args[1]) + " IN BOOLEAN MODE)");
                  break;
              default:
                  throw new URIError("Invalid query syntax, " + term.name+ " not implemented");
          }
          function addClause(sqlClause){
              if(where && !where.match(/\(\s*$/)){
                  where += " " + conjunction + " ";
              }
              where += sqlClause;
          }
      });
  }
  convertRql(query);
  var structure = {
      select: select.length > 0 ? select.join(',') : '*',
      distinct: distinct,
      from: options.table,
      where: where,
      groupBy: groupBy,
      order: order,
      limit: limit,
      offset: offset || 0
  };
  var sql;
  if(count){
      sql = generateSqlCount(structure);
  } else {
    sql = generateSql(structure);
  }
  return sql;
};

var rql2sql = function(query, options) {
    return toSQL.call(query, options);
};

exports.rql2sql = rql2sql;
exports.sqlEscapeIdentifier = sqlEscapeIdentifier;

});