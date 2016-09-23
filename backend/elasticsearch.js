
/** @module elasticsearch */
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
            return Q.nfcall(require('request'), obj)
                    .then(function(response) {
                        var body = response[1];
                        return typeof body === 'string' ? JSON.parse(body) : body;
                    });
        };
        module.exports = factory(ajax, require('underscore-data'), require('./base'), require('../rql/elasticsearch').rql2es);
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
        window.warehouse = window.warehouse || {};
        window.warehouse.ElasticSearchBackend = factory(ajax, _, warehouse.BaseBackend, warehouse.rql2es);
    }
})(function(ajax, _, BaseBackend, rql2es) {

/** @class ElasticSearchBackend
    @extends BaseBackend */
var ElasticSearchBackend = BaseBackend.extend(
/** @lends ElasticSearchBackend# */
{
    /** @method */
    initialize: function(options) {
        options = _.extend({url: '/'}, options || {});
        options.url = options.url.replace(/\/?$/, '/');
        this.options = options;

        this.url = options.url;
    },

    // /** @method */
    // objectStoreNames: function() {
    //     return Q.defer()
    //             .resolve(_.keys(this._stores));
    // },

    /** @method */
    objectStore: function(name, options) {
        var url = this.url + name;
        return new ElasticSearchStore(this, name, url, options);
    },

    // /** @method */
    // createObjectStore: function(name, options) {
    //     return Q.defer()
    //             .resolve(this.objectStore(name, options));
    // },

    // /** @method */
    // deleteObjectStore: function(name) {
    //     return Q.defer()
    //             .resolve(delete this._stores[name]);
    // }
});



/** @class ElasticSearchStore
    @extends BaseStore */
var ElasticSearchStore = BaseBackend.BaseStore.extend(
/** @lends ElasticSearchStore# */
{
    /** @method */
    initialize: function(backend, name, url, options) {
        options = _.extend({keyPath: '_id'}, options || {});
        BaseBackend.BaseStore.prototype.initialize.call(this, backend, name, options);

        this._url = url;
    },

    /** @method */
    get: function(directives) {
        var key = this._getObjectKey({}, directives);

        return ajax('GET', this._url +'/' + key)
            .then(function(item) {
                return item._source;
            });
    },

    /** @method */
    add: function(object, directives) {
        return ElasticSearchStore.prototype.put.call(this, object, directives);
    },

    /** @method */
    put: function(object, directives) {
        object = _.clone(object);
        var self = this;
        var key = this._getObjectKey(object, directives);
        // if (key) {
        //     object[this.keyPath] = key;
        // }
        var url = this._url;
        url += key ? '/' + key : '';

        if (key) {
            delete object._id;
        }

        return ajax(key ? 'PUT' : 'POST', url, object)
            .then(function(result) {
                if (key && result._shards.successful || result.created) {
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

    /** @method */
    'delete': function(directives) {
        var key = this._getObjectKey({}, directives);

        function handle(result) {
                if (result && result.found) {
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
        var q = rql2es(_.rql(query)),
            mapFn = q.fields ?
                          function(x) { return _.extend({}, {'id': x._id}, x.fields); }
                        : function(x) { return _.extend({}, {'id': x._id}, x._source); };
        return ajax('POST', this._url + '/_search', q)
            .then(function(result) {
                return result.hits.hits.map(mapFn);
            });
    },

    /** Delete all items */
    clear: function() {
        return ajax('DELETE', this._url + '/_query', {"match_all": {}});
    }
});

ElasticSearchBackend.ElasticSearchStore = ElasticSearchStore;

return ElasticSearchBackend;

});
