var fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    _ = require('underscore-data'),
    BaseBackend = require('./base');

function resolvedPromise(val) {
    var d = Q.defer();
    d.resolve(val);
    return d.promise;
}

/** @class FsBackend */
var FsBackend = BaseBackend.extend(
/** @lends FsBackend# */
{
    /** */
    initialize: function(options) {
        BaseBackend.prototype.initialize.call(this, options);
    },

    /** */
    objectStoreNames: function() {
        return Q.ninvoke(fs, 'readdir', this.options.path);
    },

    /** */
    objectStore: function(name, options) {
        return new FsStore(this, name, options);
    },

    /** */
    createObjectStore: function(name, options) {
        var d = Q.defer();
        fs.mkdir(path.join(this.options.path, name), function() {
            d.resolve(this.objectStore(name, options));
        }.bind(this));
        return d.promise;
    },

    /** */
    deleteObjectStore: function(name) {
        // store clear
        return Q.ninvoke(fs, 'rmdir', path.join(this.options.path, name));
        
    },
    encode: JSON.stringify,
    decode: JSON.parse
});



/** @class FsStore */
var FsStore = BaseBackend.BaseStore.extend(
/** @lends FsStore# */
{
    /** */
    initialize: function(backend, name, options) {
        BaseBackend.BaseStore.prototype.initialize.call(this, backend, name, options);
    },

    /** */
    get: function(directives) {
        var key = this._getObjectKey({}, directives);
        return Q.ninvoke(fs, 'readFile', this.filename(key), 'utf-8')
            .then(function(x) {
                return this.backend.decode(x);
            }.bind(this));
    },

    /** */
    add: function(object, directives) {
        var key = this._getObjectKey(object, directives);

        return Q.ninvoke(fs, 'writeFile', this.filename(key), this.backend.encode(object), {flag: 'wx'}).then(function() {
            return object;
        });
    },

    /** */
    put: function(object, directives) {
        var key = this._getObjectKey(object, directives);

        return Q.ninvoke(fs, 'writeFile', this.filename(key), this.backend.encode(object), {flag: 'w'}).then(function() {
            return object;
        });
    },

    /** */
    'delete': function(directives) {
        var key = this._getObjectKey({}, directives),
            d = Q.defer();

        Q.ninvoke(fs, 'unlink', this.filename(key))
            .then(function() {
                d.resolve(1);
            })
            .fail(function() {
                d.resolve(0);
            });

        return d.promise;
    },

    /** Execute RQL query */
    query: function(query) {
        var self = this;
        return Q.ninvoke(fs, 'readdir', path.join(this.backend.options.path, this.name))
            .then(function(files) {
                return Q.all(files.map(function(f) {
                    return self.get(f);
                }));
            })
            .then(function(vals) {
                return _.query(vals, query);
            });
    },

    /** Delete all items */
    clear: function() {
        var self = this;
        return Q.ninvoke(fs, 'readdir', path.join(this.backend.options.path, this.name))
            .then(function(files) {
                return Q.all(files.map(function(f) {
                    return self.delete(f);
                }));
            })
            .then(function() {
                return true;
            });
    },

    filename: function(file) {
        return path.join(this.backend.options.path, this.name, ''+file);
    } 
});

FsBackend.FsStore = FsStore;
module.exports = FsBackend;
