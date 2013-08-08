
var NeBackend = require('../../backend/nedb'),
    backend = new NeBackend,
    store = backend.objectStore('test', {keyPath: '_id'});


exports.store = store;