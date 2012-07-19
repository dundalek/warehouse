
(function (factory) {
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof require !== 'undefined') {
        // CommonJS
        module.exports = factory(require('q'), require('underscore-data'), require('./base'));
    } else {
        // running in browser
        window.MemoryBackend = factory(Q, _, BaseBackend);
    }
})(function(Q, _, BaseBackend) {

/** @class MemoryBackend */
var MemoryBackend = BaseBackend.extend(
/** @lends MemoryBackend# */
{
    /** */
    initialize: function(options) {
        BaseBackend.prototype.initialize.call(this, options);

        this._stores = {};
    },

    /** */
    objectStoreNames: function() {
        return Q.defer()
                .resolve(_.keys(this._stores));
    },

    /** */
    objectStore: function(name, options) {
        if (!this._stores[name]) {
            this._stores[name] = [];
        }
        return new MemoryStore(this, name, this._stores[name], options);
    },

    /** */
    createObjectStore: function(name, options) {
        return Q.defer()
                .resolve(this.objectStore(name, options));
    },

    /** */
    deleteObjectStore: function(name) {
        return Q.defer()
                .resolve(delete this._stores[name]);
    }
});



/** @class MemoryStore */
var MemoryStore = BaseBackend.BaseStore.extend(
/** @lends MemoryStore# */
{
    /** */
    initialize: function(backend, name, store, options) {
        BaseBackend.BaseStore.prototype.initialize.call(this, backend, name, options);

        this.fromJSON(options.json);
    },

    /** */
    get: function(directives) {
        var key = this._getObjectKey({}, directives);

        return Q.defer()
                .resolve(this._store[key]);
    },

    /** */
    add: function(object, directives) {
        object = _.clone(object);
        var key = this._getObjectKey(object, directives);

        this._store[key] = object;

        return Q.defer()
                .resolve(object);
    },

    /** */
    put: function(object, directives) {
        object = _.clone(object);
        var key = this._getObjectKey(object, directives);

        this._store[key] = object;

        return Q.defer()
                .resolve(object);
    },

    /** */
    'delete': function(directives) {
        var key = this._getObjectKey({}, directives);

        var val = this._store[key] && delete (this._store)[key];
        val = val ? 1 : 0;

        return Q.defer()
                .resolve(val);
    },

    /** Execute RQL query */
    query: function(query) {
        return Q.defer()
                .resolve(_.query(_.values(this._store), query));
    },

    /** Delete all items */
    clear: function() {
        this._store = {};
        return Q.defer()
                .resolve(true);
    },

    /** */
    fromJSON: function(data) {
        var ret = {};
        if (typeof data === 'string') {
            try {
                this.fromJSON(JSON.parse(data));
                return
            } catch(e) {
            }
        } else if (typeof data === 'object') {
            if (this.constructor && this.constructor.name === 'Array') {
                for (var i = 0; i < data.length; i++) {
                    ret[this._getObjectKey(data[i]) || i] = data[i];
                }
            } else {
                ret = data;
            }
        }
        this._store = ret;
    },

    /** */
    toJSON: function() {
        return _.clone(this._store);
    }
});

MemoryBackend.MemoryStore = MemoryStore;
return MemoryBackend;

});