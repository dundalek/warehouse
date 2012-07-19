
var MongoBackend = require('../../backend/mongodb'),
    backend = new MongoBackend({
        host: 'localhost',
        port: 27017,
        database: 'test'
    }),
    store = backend.objectStore('test', {keyPath: '_id'});


exports.store = store;