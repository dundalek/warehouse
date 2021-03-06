
/** @module rest */
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
        module.exports = factory(ajax, require('underscore-data'), require('./base'));
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
                obj.contentType = 'application/json';
            }
            return Q.when($.ajax(obj));
        };
        window.warehouse = window.warehouse || {};
        window.warehouse.RestBackend = factory(ajax, _, warehouse.BaseBackend);
    }
})(function(ajax, _, BaseBackend) {

/** @class RestBackend
    @extends BaseBackend */
var RestBackend = BaseBackend.extend(
/** @lends RestBackend# */
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
        return new RestStore(this, name, url, options);
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



/** @class RestStore
    @extends BaseStore */
var RestStore = BaseBackend.BaseStore.extend(
/** @lends RestStore# */
{
    /** @method */
    initialize: function(backend, name, url, options) {
        BaseBackend.BaseStore.prototype.initialize.call(this, backend, name, options);

        this._url = url;
    },

    /** @method */
    get: function(directives) {
        var key = this._getObjectKey({}, directives);

        return ajax('GET', this._url+'/' + key);
    },

    /** @method */
    add: function(object, directives) {
        object = _.clone(object);
        // var key = this._getObjectKey(object, directives);
        // if (key) {
        //     object[this.keyPath] = key;
        // }

        return ajax('POST', this._url, object);
    },

    /** @method */
    put: function(object, directives) {
        object = _.clone(object);
        var key = this._getObjectKey(object, directives);
        // if (key) {
        //     object[this.keyPath] = key;
        // }

        return ajax('PUT', this._url + '/' + key, object);
    },

    /** @method */
    'delete': function(directives) {
        var key = this._getObjectKey({}, directives);

        return ajax('DELETE', this._url + '/' + key);  
    },

    /** Execute RQL query */
    query: function(query) {
        return ajax('GET', this._url + (query ? '?' + _.rql(query).toString() : ''));
    },

    /** Delete all items */
    clear: function() {
        return ajax('DELETE', this._url);
    }
});

RestBackend.RestStore = RestStore;

return RestBackend;

});