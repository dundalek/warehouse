var Datastore = require('nedb'),
    Q = require('q'),
    _ = require('underscore-data'),
    BaseBackend = require('./base');




/** @class NeBackend */
var NeBackend = BaseBackend.extend(
/** @lends NeBackend# */
{
    /** */
    initialize: function(options) {
        options = options || {};
        this.options = options;
    },

    /** */
    objectStore: function(name, options) {
        return new NeStore(this, name, options);
    }

});

/** @class NeStore */
var NeStore = BaseBackend.BaseStore.extend(
/** @lends NeStore# */
{
    /** */
    initialize: function(backend, name, options) {
        options = _.extend({keyPath: 'id'}, options || {});
        BaseBackend.BaseStore.prototype.initialize.call(this, backend, name, options);
        var db = this._db = new Datastore(options);

        this._collection = Q.ninvoke(db, 'loadDatabase').then(function() {
            return db;
        });
    },

    /** */
    get: function(directives) {
        var search = {};
        search[this.keyPath] = this._getObjectKey({}, directives);
        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'findOne', search);
        });
    },

    /** */
    add: function(object, directives) {
        //var key = this._getObjectKey(object, directives);

        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'insert', object)
                    .then(function(result) {
                        return result || object;
                    });
        });
    },

    /** */
    put: function(object, directives) {
        var key = this._getObjectKey(object, directives),
            selector = {};
        selector[this.keyPath] = key;
        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'update', selector, object, {})
                    .then(function(result) {
                        return object;
                    });
        });
    },

    /** */
    'delete': function(directives) {
        var search = {};
        search[this.keyPath] = this._getObjectKey({}, directives);
        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'remove', search);
        });
    },

    /** Execute RQL query */
    query: function(query) {
        var meta = {},
            search = {};
        if (query && !_.isEmpty(query)) {
            var x = this.parse(query);
            search = x.search;
            meta = x.meta;
        }

        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'find', search||{}/*, meta||{}*/)
                    .then(function(result) {
                        // run through _.query to enable sorting which is not yet implemented in NeDB
                        // see https://github.com/louischatriot/nedb/issues/64
                        return _.query(result, query);
                    });
        });
    },

    /** Get native DB object */
    db: function() {
        return this.backend.open();
    },

    /** Get Collection object */
    collection: function() {
        return this._collection;
    },

    /** Delete all items */
    clear: function() {
        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'remove', {}, {safe: true});
        });
    },

    /**
     * Parse RQL query
     * @function
     */
    parse: function(query) {
        return _.rql(query).toMongo();
    },

    _getObjectKey: function(obj, key) {
        if (typeof key === 'object') {
            key = key.key;
        }

        key =  key || obj[this.keyPath];

        var intKey = parseInt(key, 10);
        if (!isNaN(intKey) && intKey.toString() === key) {
            key = intKey;
        }

        return key;
    }
});

NeBackend.NeStore = NeStore;
module.exports = NeBackend;