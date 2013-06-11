
var MemoryBackend = require('../backend/memory'),
	RestBackend = require('../backend/rest'),
	warehouse = require('..'),
	express = require('express'),
	_ = require('underscore'),
	app = express(),
	server = new MemoryBackend().objectStore('test', {keyPath: '_id'});

var port = 12345;


app.use(express.bodyParser());
app.use(express.methodOverride());

app.use(function(req, res, next) {
	if (req.url === '/' || req.url === '/index.html') {
		res.redirect('/tests/index.html');
		return;
	}

	// allow cross origin for testing
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  	res.header('Access-Control-Allow-Headers', 'Content-Type, X-HTTP-Method-Override');

  	// backbone emulateJSON support
  	if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
  		if (req.body.model) {
  			req.body = JSON.parse(req.body.model);
  		}
  	}
  	
	next();
});

app.use(express.static(__dirname + '/..'));

warehouse.applyRoutes(app, server);

// for Backbone tests
server_library = new MemoryBackend().objectStore('library', {keyPath: 'id'});
warehouse.applyRoutes(app, server_library);


app.listen(port);

console.log('Open http://localhost:'+port+'/ in your browser to run tests.')