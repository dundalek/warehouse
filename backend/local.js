
(function (factory) {
    // if (typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof require !== 'undefined') {
    //     // CommonJS
    //     module.exports = factory(require('q'), require('underscore-data'), require('..').extend);
    // } else {
        // running in browser
        window.warehouse = window.warehouse || {};
        window.warehouse.LocalBackend = factory(Q, _, warehouse.BaseBackend);
    // }
})(function(Q, _, BaseBackend) {

/** @class LocalBackend */
var LocalBackend = BaseBackend.extend(
/** @lends LocalBackend# */
{
    /** */
    initialize: function(options) {
        BaseBackend.prototype.initialize.call(this, options);

        if (typeof Storage === "undefined") {
          throw "No web storage support!";
        }        
    },

    /** */
    objectStoreNames: function() {
        return ['local', 'session'];
    },

    /** */
    objectStore: function(name, options) {
        return new LocalStore(this, name, options);
    },

    /** */
    createObjectStore: function(name, options) {
        return Q.defer()
                .resolve(this.objectStore(name, options));
    },

    /** */
    deleteObjectStore: function(name) {
        return Q.defer()
                .resolve(this.objectStore(name).clear());
    }
});



/** @class LocalStore */
var LocalStore = BaseBackend.BaseStore.extend(
/** @lends LocalStore# */
{
    /** */
    initialize: function(backend, name, options) {
        BaseBackend.BaseStore.prototype.initialize.call(this, backend, name, options);

        this._store = name === 'session' ? sessionStorage : localStorage;
    },

    /** */
    get: function(directives) {
        var key = this._getObjectKey({}, directives);

        return Q.defer()
                .resolve(JSON.parse(this._store.getItem(key)));
    },

    /** */
    add: function(object, directives) {
        return this.put(object, directives);
    },

    /** */
    put: function(object, directives) {
        object = _.clone(object);
        var key = this._getObjectKey(object, directives);

        this._store.setItem(key, JSON.stringify(object));

        return Q.defer()
                .resolve(object);
    },

    /** */
    'delete': function(directives) {
        var key = this._getObjectKey({}, directives);

        val = this._store.getItem(key) ? 1 : 0;
        this._store.removeItem(key);

        return Q.defer()
                .resolve(val);
    },

    /** Execute RQL query */
    query: function(query) {
        var items = [];
        for (var i = 0; i < this._store.length; i++) {
            items.push(JSON.parse(this._store.getItem(this._store.key(i))));
        }
        return Q.defer()
                .resolve(_.query(items, query));
    },

    /** Delete all items */
    clear: function() {
        this._store.clear();
        return Q.defer()
                .resolve(true);
    }
});

LocalBackend.LocalStore = LocalStore;

return LocalBackend;

});