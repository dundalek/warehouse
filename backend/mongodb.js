var Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server,
    Q = require('q'),
    _ = require('underscore-data'),
    BaseBackend = require('./base');




/** @class MongoBackend */
var MongoBackend = BaseBackend.extend(
/** @lends MongoBackend# */
{
    /** */
    initialize: function(options) {
        options = _.extend({}, MongoBackend.defaults, options || {});
        this.options = options;

        this._db = new Db(options.database, new Server(options.host, options.port,  {auto_reconnect: true})/*, {native_parser:true}*/);

        this._opened = null;
    },

    /** */
    objectStoreNames: function() {
        return this.open().then(function(db) {
            return Q.ncall(db.collectionNames, db);
        });
    },

    /** */
    objectStore: function(name, options) {
        return new MongoStore(this, name, options);
    },

    /** */
    createObjectStore: function(name, options) {
        return this.open().then(function(db) {
            return Q.ncall(db.collection, db, name).then(function() {
                return new MongoStore(this, name, options);
            });
        });
    },

    /** */
    deleteObjectStore: function(name) {
        return this.open().then(function(db) {
            return Q.ncall(db.dropCollection, db, name);
        });
    },

    /** */
    open: function() {
        var self = this;
        if (!this._opened) {
            this._opened = Q.ncall(this._db.open, this._db)
                .then(function (db) {
                    if (self.options.username) {
                        return Q.ncall(db.authenticate, db, self.options.username, self.options.password)
                                .then(function() {
                                    return db;
                                });
                    } else {
                        return db;
                    }
                });
        }
        return this._opened;
    },

    /** */
    close: function() {
        if (this._opened) {
            this._opened = false;
            return Q.ncall(this._db.close, this._db);
        }
    },

    /** */
    isClosed: function() {
        return Q.defer()
                .resolve(!!this._opened);
    }
});

MongoBackend.defaults = {
    host: 'localhost',
    port: 27017,
    database: 'default'
};

/** @class MongoStore */
var MongoStore = BaseBackend.BaseStore.extend(
/** @lends MongoStore# */
{
    /** */
    initialize: function(backend, name, options) {
        BaseBackend.BaseStore.prototype.initialize.call(this, backend, name, options);

        this._collection = null;
    },

    /** */
    get: function(directives) {
        var search = {};
        search[this.keyPath] = this._getObjectKey({}, directives);
        return this.collection().then(function(collection) {
            return Q.ncall(collection.findOne, collection, search);
        });
    },

    /** */
    add: function(object, directives) {
        //var key = this._getObjectKey(object, directives);

        return this.collection().then(function(collection) {
            return Q.ncall(collection.insert, collection, object, {safe:true})
                    .then(function(result) {
                        return result[0] || object;
                    });
        });
    },

    /** */
    put: function(object, directives) {
        var key = this._getObjectKey(object, directives),
            selector = {};
        selector[this.keyPath] = key;
        return this.collection().then(function(collection) {
            return Q.ncall(collection.update, collection, selector, object, {safe:true})
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
            return Q.ncall(collection.remove, collection, search, {safe:true, single: true});
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
            return Q.ncall(collection.find, collection, search||{}, meta||{})
                    .then(function(cursor) {
                        return Q.ncall(cursor.toArray, cursor);
                    });
        });
    },

    /** Get native DB object */
    db: function() {
        return this.backend.open();
    },

    /** Get Collection object */
    collection: function() {
        if (!this._collection) {
            var self = this;
            this._collection = this.db().then(function(db) {
                return Q.ncall(db.collection, db, self.name);
            });
        }
        return this._collection;
    },

    /** Delete all items */
    clear: function() {
        return this.collection().then(function(collection) {
            return Q.ncall(collection.remove, collection, {}, {safe: true});
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

MongoBackend.MongoStore = MongoStore;
module.exports = MongoBackend;