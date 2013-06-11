
var MemoryBackend = require('../../backend/memory'),
	RestBackend = require('../../backend/rest'),
	warehouse = require('../..'),
	express = require('express'),
	app1 = express(),
	server1 = new MemoryBackend().objectStore('test', {keyPath: '_id'});

var port1 = 12348, port2 = 12349;

var app2 = express(),
	server2 = new RestBackend({url: 'http://localhost:'+port1}).objectStore('test', {keyPath: '_id'});

warehouse.applyRoutes(app1, server1);
warehouse.applyRoutes(app2, server2);

app1.listen(port1);
app2.listen(port2);

exports.store = new RestBackend({url: 'http://localhost:'+port2}).objectStore('test', {keyPath: '_id'});