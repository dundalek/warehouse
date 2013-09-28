
var FsBackend = require('../../backend/fs'),
    Q = require('q'),
    fs = require('fs');

var testPath = '/tmp/warehousejs-fs-backend-test',
    storeName = 'test',
    backend = new FsBackend({path: testPath}),
    store = backend.objectStore(storeName, {keyPath: 'id'});

exports.setup = function() {
    var d = Q.defer();
    fs.mkdir(testPath, function(err, result) {
        backend.createObjectStore(storeName, {}).then(function() {
        	d.resolve(true);
        })
    });
    return d.promise;
}

exports.store = store;