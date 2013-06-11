
var MongoBackend = require('../../backend/mongodb'),
	RestBackend = require('../../backend/rest'),
	warehouse = require('../..'),
	express = require('express'),
	app = express(),
	server = new MongoBackend({
        host: 'localhost',
        port: 27017,
        database: 'test'
    }).objectStore('test', {keyPath: '_id'});

var port = 12347;

warehouse.applyRoutes(app, server);

app.listen(port);

exports.store = new RestBackend({url: 'http://localhost:'+port}).objectStore('test', {keyPath: '_id'});