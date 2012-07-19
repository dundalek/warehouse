
var MemoryBackend = require('../../backend/memory');

exports.store = new MemoryBackend().objectStore('test', {keyPath: '_id'});
exports.MemoryBackend = MemoryBackend;