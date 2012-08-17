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

function rql2es(query) {
    var q = {},
        _query = {},
        sort = [];

    function convertRql(query) {
        query.args.forEach(function(term, index) {
        	var column = term.args[0];
            switch (term.name) {
            	case "select":
            		q.fields = term.args;
            		break;
                case "eq":
                    _query.text = _query.text || {};
                    _query.text[term.args[0]] = term.args[1];
                break;
                case "ne":
                	var tmp = {};
                	tmp[term.args[0]] = term.args[1];

                	q.filter = q.filter || {};
                	q.filter.not = q.filter.not || {};
                	q.filter.not.query = q.filter.not.query || {};
                	q.filter.not.query.text = q.filter.not.query.text || {};
                	q.filter.not.query.text = tmp;
                break;
                case "lt":
                case "gt":
                case "le":
                case "ge":
                	if (term.name[1] === 'e') {
                		term.name = term.name[0] + 'te';
                	}
                	q.filter = q.filter || {};
                	q.filter.range = q.filter.range || {};
                	q.filter.range[term.args[0]] = q.filter.range[term.args[0]] || {};
                	q.filter.range[term.args[0]][term.name] = term.args[1];

                	break;
                case "in":
                	tmp = term.args[1].map(function(x) {
                		var a = {};
                		a[column] = x;
                		return {text: a};
                	});

                	_query.bool = _query.bool || {};
                	_query.bool.should = _query.bool.should || [];
                	_query.bool.should = _query.bool.should.concat(tmp);
                	break;
				case "out":
                	tmp = term.args[1].map(function(x) {
                		var a = {};
                		a[column] = x;
                		return {text: a};
                	});

                	q.filter = q.filter || {};
                	q.filter.not = q.filter.not || {};
                	q.filter.not.query = q.filter.not.query || {};

                	var __query = q.filter.not.query;

                	__query.bool = __query.bool || {};
                	__query.bool.should = __query.bool.should || [];
                	__query.bool.should = __query.bool.should.concat(tmp);
                	break;
                case "sort":
                    if(term.args.length === 0)
                          throw new URIError("Must specify a sort criteria");
                  term.args.forEach(function(sortAttribute){
                      var firstChar = sortAttribute.charAt(0);
                      var orderDir = "asc";
                      if(firstChar == "-" || firstChar == "+"){
                          if(firstChar == "-"){
                              orderDir = "desc";
                          }
                          sortAttribute = sortAttribute.substring(1);
                          if (sortAttribute === '_id') {
                          	sortAttribute = '_uid';
                          }
                      }
                      var obj = {};
                      obj[sortAttribute] = orderDir;
                      sort.push(obj);
                  });
                break;
				case "limit":
                  q.size = term.args[0];
                  q.from = term.args[1] || 0;
                  break;
            }
        });

    }

    convertRql(query);

    if (_.isEmpty(_query)) {
        _query = {"match_all": {}};
    }
    q.query = _query;

    if (sort.length > 0) {
        q.sort = sort;
    }

    return q;
}

exports.rql2es = rql2es;

});