
(function (factory) {
    var ajax, Q;
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof require !== 'undefined') {
        // CommonJS
        Q = require('q');
        ajax = function(method, url, data) {
            var obj = {
                method: method,
                url: url,
                json: data
            };
            return Q.ncall(require('request'), this, obj)
                    .then(function(response) {
                        var body = response[1];
                        return typeof body === 'string' ? JSON.parse(body) : body;
                    });
        };
        module.exports = factory(ajax, require('underscore-data'), require('./rest'));
    } else {
        // running in browser
        Q = this.Q;
        ajax = function(method, url, data) {
            var obj = {
                type: method,
                url: url,
                dataType: 'json'
            };
            if (data) {
                obj.data = JSON.stringify(data);
                //obj.contentType = 'application/json';
            }
            return Q.when($.ajax(obj));
        };
        window.ElasticSearchBackend = factory(ajax, _, BaseBackend);
    }
})(function(ajax, _, BaseBackend) {

/** @class ElasticSearchBackend */
var ElasticSearchBackend = BaseBackend.extend(
/** @lends ElasticSearchBackend# */
{
    /** */
    initialize: function(options) {
        options = _.extend({url: '/'}, options || {});
        options.url = options.url.replace(/\/?$/, '/');
        this.options = options;

        this.url = options.url;
    },

    // /** */
    // objectStoreNames: function() {
    //     return Q.defer()
    //             .resolve(_.keys(this._stores));
    // },

    /** */
    objectStore: function(name, options) {
        var url = this.url + name;
        return new ElasticSearchStore(this, name, url, options);
    },

    // /** */
    // createObjectStore: function(name, options) {
    //     return Q.defer()
    //             .resolve(this.objectStore(name, options));
    // },

    // /** */
    // deleteObjectStore: function(name) {
    //     return Q.defer()
    //             .resolve(delete this._stores[name]);
    // }
});



/** @class ElasticSearchStore */
var ElasticSearchStore = BaseBackend.BaseStore.extend(
/** @lends ElasticSearchStore# */
{
    /** */
    initialize: function(backend, name, url, options) {
        options = _.extend({keyPath: '_id'}, options || {});
        BaseBackend.BaseStore.prototype.initialize.call(this, backend, name, options);

        this._url = url;
    },

    /** */
    get: function(directives) {
        var key = this._getObjectKey({}, directives);

        return ajax('GET', this._url +'/' + key)
            .then(function(item) {
                return item._source;
            });
    },

    /** */
    add: function(object, directives) {
        return ElasticSearchStore.prototype.put.call(this, object, directives);
    },

    /** */
    put: function(object, directives) {
        object = _.clone(object);
        var self = this;
        var key = this._getObjectKey(object, directives);
        // if (key) {
        //     object[this.keyPath] = key;
        // }
        var url = this._url;
        url += key ? '/' + key : '';

        return ajax(key ? 'PUT' : 'POST', url, object)
            .then(function(result) {
                if (result.ok) {
                    if (result && result._id) {
                        key = result._id;

                        // key to int coercion
                        var intKey = parseInt(key, 10);
                        if (!isNaN(intKey) && intKey.toString() === key) {
                            key = intKey;
                        }

                        object[self.keyPath] = key;
                    }
                    return object;
                } else {
                    throw 'Not OK: ' + JSON.stringify(result);
                }
            });
    },

    /** */
    'delete': function(directives) {
        var key = this._getObjectKey({}, directives);

        function handle(result) {
                if (result && result.ok) {
                    return result.found ? 1 : 0;
                } else if (result && result.responseText) {
                    result = JSON.parse(result.responseText);
                    return result.found ? 1 : 0;
                } else {
                    throw 'Not OK: ' + JSON.stringify(result);
                }
            }

        return ajax('DELETE', this._url + '/' + key)
            .then(handle).fail(handle);            
    },

    /** Execute RQL query */
    query: function(query) {
        var q = rql2es(_.rql(query));
        return ajax('POST', this._url + '/_search', q)
            .then(function(result) {
                return result.hits.hits.map(function(x) { return x._source; });
            });
    },

    /** Delete all items */
    clear: function() {
        return ajax('DELETE', this._url + '/_query', {"match_all": {}});
    }
});

function rql2es(query) {
    var q = {},
        _query = {},
        _sort = [];

    function convertRql(query) {
        query.args.forEach(function(term, index) {
            switch (term.name) {
                case "eq":
                    _query.text = _query.text || {};
                    _query.text[term.args[0]] = term.args[1];
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
                      }
                      var obj = {};
                      obj[sortAttribute] = orderDir;
                      _sort.push(obj);
                  });
                break;
            }
        });

    }

    convertRql(query);

    if (_.isEmpty(_query)) {
        _query = {"match_all": {}};
    }
    q.query = _query;

    if (_sort.length > 0) {
        q.sort = _sort;
    }

    return q;
}

ElasticSearchBackend.ElasticSearchStore = ElasticSearchStore;

return ElasticSearchBackend;

});