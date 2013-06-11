
var MemoryBackend = require('../../backend/memory'),
	RestBackend = require('../../backend/rest'),
	warehouse = require('../..'),
	express = require('express'),
	app = express(),
	server = new MemoryBackend().objectStore('test', {keyPath: '_id'});

var port = 12346;

warehouse.applyRoutes(app, server);

app.listen(port);

exports.store = new RestBackend({url: 'http://localhost:'+port}).objectStore('test', {keyPath: '_id'});